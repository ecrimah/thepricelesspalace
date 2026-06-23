import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { getMoolreConfig, checkPaymentStatus } from '@/lib/moolre';

/**
 * Moolre payment verification endpoint.
 * Called from the order-success page (and admin re-verify) after a customer
 * returns from the Moolre payment page.
 *
 * SECURITY: We ONLY trust Moolre's status API for payment confirmation.
 * The redirect query string is not proof of payment.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`verify:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many requests' },
                { status: 429 }
            );
        }

        const { orderNumber } = await req.json();

        if (!orderNumber || typeof orderNumber !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderNumber' }, { status: 400 });
        }

        if (!/^ORD-\d+-\d+$/.test(orderNumber)) {
            return NextResponse.json({ success: false, message: 'Invalid order number format' }, { status: 400 });
        }

        const cfg = getMoolreConfig();
        if (!cfg) {
            console.error('[Moolre Verify] Missing Moolre configuration');
            return NextResponse.json({
                success: false,
                message: 'Payment verification unavailable'
            }, { status: 503 });
        }

        console.log('[Moolre Verify] Checking payment for:', orderNumber);

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, payment_status, status, total, email, phone, shipping_address, metadata, payment_method')
            .eq('order_number', orderNumber)
            .single();

        if (fetchError || !order) {
            console.error('[Moolre Verify] Order not found:', orderNumber);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            console.log('[Moolre Verify] Order already paid:', orderNumber);
            return NextResponse.json({
                success: true,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Order already paid'
            });
        }

        if (order.payment_method && order.payment_method !== 'moolre' && order.payment_method !== 'momo') {
            return NextResponse.json({
                success: false,
                message: 'This order does not use Moolre payment'
            }, { status: 400 });
        }

        // Build list of refs to try — saved attempt ref first, plain order number as fallback
        const refsToTry: string[] = [];
        if (order.metadata?.moolre_reference) refsToTry.push(order.metadata.moolre_reference);
        if (!refsToTry.includes(orderNumber)) refsToTry.push(orderNumber);

        let verifiedRef: string | null = null;
        let verifiedTxId: string | undefined;

        for (const ref of refsToTry) {
            if (verifiedRef) break;
            const status = await checkPaymentStatus(cfg, ref);
            console.log('[Moolre Verify] Status for', ref, ':', 'API ok:', status.ok, '| Paid:', status.success);

            if (status.success) {
                // Verify amount matches order total
                if (status.amount !== undefined) {
                    const expectedAmount = Number(order.total);
                    if (Math.abs(status.amount - expectedAmount) > 0.01) {
                        console.error('[Moolre Verify] AMOUNT MISMATCH! Expected:', expectedAmount, 'Got:', status.amount);
                        continue;
                    }
                }
                verifiedRef = ref;
                verifiedTxId = status.transactionId;
                console.log('[Moolre Verify] Payment confirmed via ref:', ref);
            }
        }

        if (!verifiedRef) {
            console.log('[Moolre Verify] Cannot verify payment for:', orderNumber);
            return NextResponse.json({
                success: false,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Payment not yet confirmed by payment provider'
            });
        }

        console.log('[Moolre Verify] Marking order paid for:', orderNumber);

        const { data: orderJson, error: updateError } = await supabaseAdmin
            .rpc('mark_order_paid', {
                order_ref: orderNumber,
                moolre_ref: String(verifiedRef)
            });

        if (updateError) {
            console.error('[Moolre Verify] RPC Error:', updateError.message);
            return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
        }

        // Annotate gateway metadata
        try {
            await supabaseAdmin
                .from('orders')
                .update({
                    metadata: {
                        ...(orderJson?.metadata || {}),
                        payment_provider: 'moolre',
                        moolre_reference: verifiedRef,
                        moolre_transaction_id: verifiedTxId,
                        moolre_paid_at: new Date().toISOString(),
                    }
                })
                .eq('order_number', orderNumber);
        } catch (annotateErr: any) {
            console.warn('[Moolre Verify] Metadata annotate failed:', annotateErr.message);
        }

        console.log('[Moolre Verify] Order marked as paid:', orderNumber);

        if (orderJson?.email) {
            try {
                await supabaseAdmin.rpc('update_customer_stats', {
                    p_customer_email: orderJson.email,
                    p_order_total: orderJson.total
                });
            } catch (statsError: any) {
                console.error('[Moolre Verify] Customer stats failed:', statsError.message);
            }
        }

        if (orderJson) {
            try {
                await sendOrderConfirmation(orderJson);
                console.log('[Moolre Verify] Notifications sent for:', orderNumber);
            } catch (notifyError: any) {
                console.error('[Moolre Verify] Notification failed:', notifyError.message);
            }
        }

        return NextResponse.json({
            success: true,
            status: 'processing',
            payment_status: 'paid',
            message: 'Payment verified and order updated'
        });

    } catch (error: any) {
        console.error('[Moolre Verify] Error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
