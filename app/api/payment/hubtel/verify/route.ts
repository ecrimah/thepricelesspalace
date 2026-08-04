import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { checkHubtelStatus, isHubtelPaid } from '@/lib/hubtel';

/**
 * Hubtel payment verification endpoint.
 * Called from the order-success page (and admin re-verify) after a customer
 * returns from the Hubtel checkout page.
 *
 * SECURITY: We ONLY trust Hubtel's RMSC status API for payment confirmation.
 * The redirect query string is not proof of payment.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`hubtel-verify:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        const { orderNumber } = await req.json();

        if (!orderNumber || typeof orderNumber !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderNumber' }, { status: 400 });
        }

        if (!/^ORD-\d+-\d+$/.test(orderNumber)) {
            return NextResponse.json({ success: false, message: 'Invalid order number format' }, { status: 400 });
        }

        if (
            !process.env.HUBTEL_API_ID ||
            !process.env.HUBTEL_API_KEY ||
            !process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
        ) {
            console.error('[Hubtel Verify] Missing Hubtel configuration');
            return NextResponse.json(
                { success: false, message: 'Payment verification unavailable' },
                { status: 503 }
            );
        }

        console.log('[Hubtel Verify] Checking payment for:', orderNumber);

        const { data: order, error: fetchError } = await supabaseAdmin
            .from('orders')
            .select('id, order_number, payment_status, status, total, email, phone, shipping_address, metadata, payment_method')
            .eq('order_number', orderNumber)
            .single();

        if (fetchError || !order) {
            console.error('[Hubtel Verify] Order not found:', orderNumber);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            console.log('[Hubtel Verify] Order already paid:', orderNumber);
            return NextResponse.json({
                success: true,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Order already paid',
            });
        }

        // Allow hubtel / momo / unset (legacy pending) — refuse clearly for other gateways
        if (
            order.payment_method &&
            !['hubtel', 'momo', 'moolre', 'paystack'].includes(order.payment_method)
        ) {
            return NextResponse.json(
                { success: false, message: 'This order does not use Hubtel payment' },
                { status: 400 }
            );
        }

        const metaRef = (order.metadata as any)?.hubtel_client_reference as string | undefined;
        // Fallbacks for older orders that never persisted hubtel_client_reference
        const refsToTry = Array.from(
            new Set(
                [metaRef, orderNumber, orderNumber.slice(0, 32)].filter(
                    (r): r is string => Boolean(r && String(r).trim())
                )
            )
        );
        if (!metaRef) {
            console.warn(
                '[Hubtel Verify] No hubtel_client_reference on order; trying fallbacks:',
                orderNumber,
                refsToTry
            );
        }

        const expectedAmount = Number(order.total) || 0;

        let verified = false;
        let settlementAmount: number | null = null;
        let clientReference = metaRef || orderNumber;
        try {
            for (const ref of refsToTry) {
                const status = await checkHubtelStatus(ref);
                const sStatus = String(status?.data?.status || '').toLowerCase();
                const paid = isHubtelPaid(sStatus, status?.responseCode);
                console.log(
                    '[Hubtel Verify] ref:',
                    ref,
                    '| status:',
                    status?.data?.status,
                    '| amount:',
                    status?.data?.amount,
                    '| amountAfterCharges:',
                    status?.data?.amountAfterCharges,
                    '| expected:',
                    expectedAmount
                );
                if (paid) {
                    verified = true;
                    clientReference = ref;
                    const settlement = status?.data?.amountAfterCharges ?? status?.data?.amount;
                    if (settlement !== undefined && settlement !== null) {
                        const n = parseFloat(String(settlement));
                        if (Number.isFinite(n)) settlementAmount = n;
                    }
                    break;
                }
            }
        } catch (e: any) {
            console.warn('[Hubtel Verify] Status API failed:', e?.message || e);
        }

        if (!verified && !metaRef) {
            return NextResponse.json({
                success: false,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Payment reference not found — ask customer to pay again or mark paid manually after confirming in Hubtel',
            });
        }

        if (verified && settlementAmount !== null && Math.abs(settlementAmount - expectedAmount) > 0.01) {
            console.error(
                '[Hubtel Verify] AMOUNT MISMATCH. Expected:',
                expectedAmount,
                'Got (settlement):',
                settlementAmount
            );
            verified = false;
        }

        if (!verified) {
            return NextResponse.json({
                success: false,
                status: order.status,
                payment_status: order.payment_status,
                message: 'Payment not yet confirmed by payment provider',
            });
        }

        console.log('[Hubtel Verify] Marking order paid for:', orderNumber);

        const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
            order_ref: orderNumber,
            moolre_ref: clientReference,
        });

        if (updateError) {
            console.error('[Hubtel Verify] RPC Error:', updateError.message);
            return NextResponse.json({ success: false, message: 'Failed to update order' }, { status: 500 });
        }

        try {
            await supabaseAdmin
                .from('orders')
                .update({
                    payment_method: 'hubtel',
                    metadata: {
                        ...(orderJson?.metadata || {}),
                        payment_provider: 'hubtel',
                        hubtel_client_reference: clientReference,
                        hubtel_paid_at: new Date().toISOString(),
                    },
                })
                .eq('order_number', orderNumber);
        } catch (annotateErr: any) {
            console.warn('[Hubtel Verify] Metadata annotate failed:', annotateErr.message);
        }

        console.log('[Hubtel Verify] Order marked as paid:', orderNumber);

        if (orderJson?.email) {
            try {
                await supabaseAdmin.rpc('update_customer_stats', {
                    p_customer_email: orderJson.email,
                    p_order_total: orderJson.total,
                });
            } catch (statsError: any) {
                console.error('[Hubtel Verify] Customer stats failed:', statsError.message);
            }
        }

        if (orderJson) {
            try {
                await sendOrderConfirmation(orderJson);
                console.log('[Hubtel Verify] Notifications sent for:', orderNumber);
            } catch (notifyError: any) {
                console.error('[Hubtel Verify] Notification failed:', notifyError.message);
            }
        }

        return NextResponse.json({
            success: true,
            status: 'processing',
            payment_status: 'paid',
            message: 'Payment verified and order updated',
        });
    } catch (error: any) {
        console.error('[Hubtel Verify] Error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
