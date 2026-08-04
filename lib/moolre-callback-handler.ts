import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { getMoolreConfig, checkPaymentStatus } from '@/lib/moolre';
import {
  finalizePaymentAttempt,
  markWebhookProcessed,
  recordWebhookEvent,
} from '@/lib/payment-audit';
import {
  extractMoolreCallbackSecret,
  isValidMoolreCallbackSecret,
} from '@/lib/moolre-callback-auth';

/**
 * Shared Moolre webhook processor used by query-secret and path-secret routes.
 */
export async function handleMoolreCallback(req: Request, pathSecret?: string) {
  console.log('[Moolre Callback] POST received at', new Date().toISOString());

  try {
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(`callback:${clientId}`, RATE_LIMITS.callback);
    if (!rateLimitResult.success) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const expectedSecret = process.env.MOOLRE_CALLBACK_SECRET;
    if (!expectedSecret) {
      console.error('[Moolre Callback] MOOLRE_CALLBACK_SECRET is not configured');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 503 });
    }

    const provided = extractMoolreCallbackSecret(req, pathSecret);
    if (!isValidMoolreCallbackSecret(provided)) {
      console.error(
        '[Moolre Callback] Invalid callback secret (query/header/path). Has secret param:',
        Boolean(provided)
      );
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const cfg = getMoolreConfig();
    if (!cfg) {
      console.error('[Moolre Callback] Missing Moolre configuration');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      console.error('[Moolre Callback] Invalid JSON body');
      return NextResponse.json({ success: false, message: 'Invalid body' }, { status: 400 });
    }

    const data = body?.data || {};
    const externalRef: string = data?.externalref || body?.externalref || '';

    console.log(
      '[Moolre Callback] code:',
      body?.code,
      '| externalref:',
      externalRef,
      '| txstatus:',
      data?.txstatus
    );

    if (!externalRef) {
      console.error('[Moolre Callback] Missing externalref in webhook payload');
      return NextResponse.json({ success: false, message: 'Missing reference' }, { status: 400 });
    }

    const merchantOrderRef = externalRef.replace(/-R\d+$/, '');
    const eventId = String(
      data?.transactionid || body?.transactionid || `${externalRef}:${body?.code || ''}:${data?.txstatus || ''}`
    );

    const { id: webhookId, duplicate } = await recordWebhookEvent({
      gateway: 'moolre',
      externalEventId: eventId,
      eventType: String(body?.code || data?.txstatus || 'callback'),
      internalReference: externalRef,
      gatewayReference: String(data?.transactionid || ''),
      payload: {
        code: body?.code,
        message: body?.message,
        externalref: externalRef,
        txstatus: data?.txstatus,
      },
      signatureValid: true,
    });
    if (duplicate) {
      return NextResponse.json({ success: true, message: 'Duplicate event ignored' });
    }

    const status = await checkPaymentStatus(cfg, externalRef);
    if (!status.success) {
      console.log(
        `[Moolre Callback] Payment not confirmed for ${merchantOrderRef} (status API). Ignoring.`
      );
      await markWebhookProcessed(webhookId, 'ignored', 'not confirmed by status API');
      return NextResponse.json({ success: true, message: 'Acknowledged — not confirmed' });
    }

    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, total, email, metadata')
      .eq('order_number', merchantOrderRef)
      .single();

    if (fetchError || !existingOrder) {
      console.error('[Moolre Callback] Order not found:', merchantOrderRef);
      await markWebhookProcessed(webhookId, 'failed', 'order not found');
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (existingOrder.payment_status === 'paid') {
      console.log('[Moolre Callback] Order already paid, skipping:', merchantOrderRef);
      await markWebhookProcessed(webhookId, 'ignored', 'order already paid');
      return NextResponse.json({ success: true, message: 'Order already processed' });
    }

    if (status.amount !== undefined) {
      const expectedAmount = Number(existingOrder.total);
      if (Math.abs(status.amount - expectedAmount) > 0.01) {
        console.error(
          '[Moolre Callback] AMOUNT MISMATCH — REJECTING! Expected:',
          expectedAmount,
          'Got:',
          status.amount,
          'Order:',
          merchantOrderRef
        );
        await markWebhookProcessed(webhookId, 'failed', 'amount mismatch');
        return NextResponse.json(
          { success: false, message: 'Payment amount does not match order total' },
          { status: 400 }
        );
      }
    }

    console.log(`[Moolre Callback] Payment SUCCESS for Order ${merchantOrderRef}`);

    const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
      order_ref: merchantOrderRef,
      moolre_ref: String(externalRef),
    });

    if (updateError) {
      console.error('[Moolre Callback] RPC Error:', updateError.message);
      await markWebhookProcessed(webhookId, 'failed', updateError.message);
      return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
    }

    await finalizePaymentAttempt({
      internalReference: externalRef,
      status: 'successful',
      gatewayReference: String(data?.transactionid || ''),
      amountPaid: status.amount,
    });
    await markWebhookProcessed(webhookId, 'processed');

    if (!orderJson) {
      console.error('[Moolre Callback] Order not found after RPC:', merchantOrderRef);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Best-effort metadata annotate — do not block ack
    void supabaseAdmin
      .from('orders')
      .update({
        payment_provider: 'moolre',
        metadata: {
          ...(orderJson.metadata || {}),
          payment_provider: 'moolre',
          moolre_reference: externalRef,
          moolre_transaction_id: status.transactionId,
          moolre_paid_at: new Date().toISOString(),
        },
      })
      .eq('id', orderJson.id)
      .then(({ error }) => {
        if (error) console.warn('[Moolre Callback] Metadata annotate failed:', error.message);
      });

    // Secondary work AFTER ack path — never block gateway retries on SMS/email
    void (async () => {
      try {
        if (orderJson.email) {
          await supabaseAdmin.rpc('update_customer_stats', {
            p_customer_email: orderJson.email,
            p_order_total: orderJson.total,
          });
        }
      } catch (statsError: any) {
        console.error('[Moolre Callback] Customer stats failed:', statsError.message);
      }
      try {
        await sendOrderConfirmation(orderJson);
      } catch (notifyError: any) {
        console.error('[Moolre Callback] Notification failed:', notifyError.message);
      }
    })();

    return NextResponse.json({ success: true, message: 'Payment verified and order updated' });
  } catch (error: any) {
    console.error('[Moolre Callback] Critical Error:', error.message);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
