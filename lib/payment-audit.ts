/**
 * Payment / webhook / SMS audit helpers for plain Postgres.
 * Uses supabaseAdmin (pg compat). Never stores full secrets or PANs.
 */
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type PaymentGateway = 'moolre' | 'hubtel' | 'paystack' | 'manual' | 'pos' | 'other';

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function hashRecipient(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return createHash('sha256').update(phone.trim().toLowerCase()).digest('hex');
}

/** Record a payment initiation (best-effort; never blocks checkout). */
export async function recordPaymentAttempt(input: {
  orderId: string;
  gateway: PaymentGateway;
  internalReference: string;
  gatewayReference?: string | null;
  expectedAmount: number;
  currency?: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('payment_attempts')
      .upsert(
        {
          order_id: input.orderId,
          gateway: input.gateway,
          internal_reference: input.internalReference,
          gateway_reference: input.gatewayReference || null,
          expected_amount: input.expectedAmount,
          currency: input.currency || 'GHS',
          status: 'pending',
          idempotency_key: input.idempotencyKey || input.internalReference,
          metadata: input.metadata || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'internal_reference' }
      )
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[payment-audit] recordPaymentAttempt:', error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (e: any) {
    console.error('[payment-audit] recordPaymentAttempt:', e?.message);
    return null;
  }
}

/** Mark attempt successful/failed after gateway verification. */
export async function finalizePaymentAttempt(input: {
  internalReference: string;
  status: 'successful' | 'failed' | 'cancelled' | 'expired';
  gatewayReference?: string | null;
  amountPaid?: number | null;
  failureReason?: string | null;
}): Promise<void> {
  try {
    const patch: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
    };
    if (input.gatewayReference) patch.gateway_reference = input.gatewayReference;
    if (input.amountPaid != null) patch.amount_paid = input.amountPaid;
    if (input.failureReason) patch.failure_reason = input.failureReason;
    if (input.status === 'successful') patch.verified_at = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('payment_attempts')
      .update(patch)
      .eq('internal_reference', input.internalReference);
    if (error) console.error('[payment-audit] finalizePaymentAttempt:', error.message);
  } catch (e: any) {
    console.error('[payment-audit] finalizePaymentAttempt:', e?.message);
  }
}

/**
 * Insert webhook event. Returns { duplicate: true } if already seen.
 */
export async function recordWebhookEvent(input: {
  gateway: PaymentGateway | string;
  externalEventId?: string | null;
  eventType?: string | null;
  internalReference?: string | null;
  gatewayReference?: string | null;
  payload: unknown;
  signatureValid?: boolean | null;
  orderId?: string | null;
}): Promise<{ id: string | null; duplicate: boolean }> {
  const payload_hash = hashPayload(input.payload);
  try {
    const row = {
      gateway: input.gateway,
      external_event_id: input.externalEventId || null,
      event_type: input.eventType || null,
      internal_reference: input.internalReference || null,
      gateway_reference: input.gatewayReference || null,
      payload_hash,
      signature_valid: input.signatureValid ?? null,
      processing_status: 'received',
      order_id: input.orderId || null,
      metadata: {},
    };
    const { data, error } = await supabaseAdmin
      .from('payment_webhook_events')
      .insert(row)
      .select('id')
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '');
      if (msg.includes('duplicate') || msg.includes('unique') || (error as any).code === '23505') {
        return { id: null, duplicate: true };
      }
      console.error('[payment-audit] recordWebhookEvent:', msg);
      return { id: null, duplicate: false };
    }
    return { id: data?.id ?? null, duplicate: false };
  } catch (e: any) {
    console.error('[payment-audit] recordWebhookEvent:', e?.message);
    return { id: null, duplicate: false };
  }
}

export async function markWebhookProcessed(
  id: string | null,
  status: 'processed' | 'ignored' | 'failed',
  failureReason?: string
): Promise<void> {
  if (!id) return;
  try {
    await supabaseAdmin
      .from('payment_webhook_events')
      .update({
        processing_status: status,
        failure_reason: failureReason || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch (e: any) {
    console.error('[payment-audit] markWebhookProcessed:', e?.message);
  }
}

/** Idempotent SMS log. Returns false if this send should be skipped (already sent). */
export async function claimSmsSend(input: {
  messageType: string;
  idempotencyKey: string;
  recipient?: string | null;
  orderId?: string | null;
  templateKey?: string | null;
}): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from('sms_messages').insert({
      message_type: input.messageType,
      idempotency_key: input.idempotencyKey,
      recipient_hash: hashRecipient(input.recipient),
      recipient_masked: maskPhone(input.recipient),
      related_order_id: input.orderId || null,
      template_key: input.templateKey || null,
      status: 'queued',
      attempt_count: 1,
    });
    if (error) {
      const msg = String(error.message || '');
      if (msg.includes('duplicate') || msg.includes('unique') || (error as any).code === '23505') {
        return false;
      }
      console.error('[payment-audit] claimSmsSend:', msg);
      return true; // allow send if audit table missing/fails
    }
    return true;
  } catch (e: any) {
    console.error('[payment-audit] claimSmsSend:', e?.message);
    return true;
  }
}

export async function completeSmsSend(
  idempotencyKey: string,
  ok: boolean,
  providerMessageId?: string | null,
  failureReason?: string | null
): Promise<void> {
  try {
    await supabaseAdmin
      .from('sms_messages')
      .update({
        status: ok ? 'sent' : 'failed',
        provider_message_id: providerMessageId || null,
        failure_reason: failureReason || null,
        sent_at: ok ? new Date().toISOString() : null,
      })
      .eq('idempotency_key', idempotencyKey);
  } catch (e: any) {
    console.error('[payment-audit] completeSmsSend:', e?.message);
  }
}
