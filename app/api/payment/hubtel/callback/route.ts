import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { checkHubtelStatus, isHubtelPaid, stripHubtelReferenceSuffix } from '@/lib/hubtel';

/**
 * Hubtel Online Checkout callback handler.
 *
 * SECURITY: Hubtel doesn't sign callbacks, so we re-query the RMSC status
 * endpoint with the same clientReference and only mark the order paid if
 * Hubtel's own API agrees the transaction is "Paid" AND the settlement
 * amount matches the order total.
 */
export async function POST(req: Request) {
    console.log('[Hubtel Callback] POST received at', new Date().toISOString());

    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`hubtel-callback:${clientId}`, RATE_LIMITS.callback);
        if (!rateLimitResult.success) {
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        let body: any = {};
        const contentType = req.headers.get('content-type') || '';
        try {
            if (contentType.includes('application/json')) {
                body = await req.json();
            } else if (contentType.includes('form')) {
                const formData = await req.formData();
                body = Object.fromEntries(formData.entries());
            } else {
                const raw = await req.text();
                try {
                    body = JSON.parse(raw);
                } catch {
                    body = Object.fromEntries(new URLSearchParams(raw).entries());
                }
            }
        } catch {
            return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
        }

        const responseCode = body.ResponseCode ?? body.responseCode ?? body.code;
        const topStatus = body.Status ?? body.status;
        const data = body.Data ?? body.data ?? {};

        const rawClientReference = (
            data.ClientReference ??
            data.clientReference ??
            body.ClientReference ??
            body.clientReference ??
            ''
        ).toString();
        const merchantOrderRef = stripHubtelReferenceSuffix(rawClientReference);

        const checkoutId = (data.CheckoutId ?? data.checkoutId ?? body.CheckoutId ?? '').toString();
        const callbackAmount =
            data.Amount !== undefined && data.Amount !== null
                ? parseFloat(String(data.Amount))
                : null;

        console.log(
            '[Hubtel Callback] ref:',
            merchantOrderRef,
            '| ResponseCode:',
            responseCode,
            '| Status:',
            topStatus,
            '| innerStatus:',
            data.Status,
            '| amount:',
            callbackAmount,
            '| checkoutId:',
            checkoutId
        );

        if (!merchantOrderRef) {
            console.error('[Hubtel Callback] Missing client reference. Body:', JSON.stringify(body).slice(0, 500));
            return NextResponse.json({ success: false, message: 'Missing client reference' }, { status: 400 });
        }

        const innerStatus = String(data.Status ?? topStatus ?? '').toLowerCase();
        const looksSuccessful =
            isHubtelPaid(String(topStatus || ''), responseCode) || isHubtelPaid(innerStatus, responseCode);

        // Prefer exact order_number; fall back to stored hubtel_client_reference
        // (needed when makeHubtelClientReference truncated a long ORD-...).
        let existingOrder: any = null;
        let fetchError: any = null;
        {
            const byNumber = await supabaseAdmin
                .from('orders')
                .select('id, order_number, payment_status, total, email, metadata')
                .eq('order_number', merchantOrderRef)
                .maybeSingle();
            existingOrder = byNumber.data;
            fetchError = byNumber.error;
        }
        if (!existingOrder && rawClientReference) {
            const byRef = await supabaseAdmin
                .from('orders')
                .select('id, order_number, payment_status, total, email, metadata')
                .contains('metadata', { hubtel_client_reference: rawClientReference })
                .maybeSingle();
            if (byRef.data) {
                existingOrder = byRef.data;
                fetchError = null;
                console.log(
                    '[Hubtel Callback] Resolved via hubtel_client_reference →',
                    existingOrder.order_number
                );
            } else if (byRef.error) {
                fetchError = byRef.error;
            }
        }

        if (fetchError || !existingOrder) {
            console.error('[Hubtel Callback] Order not found:', merchantOrderRef, '| raw:', rawClientReference);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        const orderNumberForPaid = existingOrder.order_number as string;

        // Already paid — idempotent
        if (existingOrder.payment_status === 'paid') {
            return NextResponse.json({ success: true, message: 'Order already processed' });
        }

        const expectedAmount = Number(existingOrder.total) || 0;

        if (!looksSuccessful) {
            console.log('[Hubtel Callback] Recording failure for', merchantOrderRef);
            await supabaseAdmin
                .from('orders')
                .update({
                    payment_status: 'failed',
                    metadata: {
                        ...(existingOrder.metadata || {}),
                        hubtel_checkout_id: checkoutId || null,
                        hubtel_response_code: String(responseCode || ''),
                        failure_reason: data.Description || body.Message || 'Payment failed',
                        failure_at: new Date().toISOString(),
                    },
                })
                .eq('id', existingOrder.id);

            return NextResponse.json({ success: false, message: 'Payment not successful' });
        }

        // Defense-in-depth: re-verify with Hubtel before marking paid.
        let serverConfirmed = false;
        let confirmedSettlement: number | null = null;
        try {
            const status = await checkHubtelStatus(rawClientReference || merchantOrderRef);
            const sStatus = String(status?.data?.status || '').toLowerCase();
            serverConfirmed = isHubtelPaid(sStatus, status?.responseCode);
            // Prefer merchant-settlement amount (customer may be surcharged).
            const settlement = status?.data?.amountAfterCharges ?? status?.data?.amount;
            if (settlement !== undefined && settlement !== null) {
                const n = parseFloat(String(settlement));
                if (Number.isFinite(n)) confirmedSettlement = n;
            }
            console.log(
                '[Hubtel Callback] RMSC status:',
                status?.data?.status,
                '| responseCode:',
                status?.responseCode,
                '| amount:',
                status?.data?.amount,
                '| amountAfterCharges:',
                status?.data?.amountAfterCharges,
                '| expected:',
                expectedAmount
            );
        } catch (e: any) {
            console.warn('[Hubtel Callback] Status re-verification failed:', e?.message || e);
        }

        if (!serverConfirmed) {
            console.error('[Hubtel Callback] Status endpoint did not confirm payment. Rejecting.');
            return NextResponse.json(
                { success: false, message: 'Payment not confirmed by gateway' },
                { status: 400 }
            );
        }

        const amountToCheck = confirmedSettlement ?? callbackAmount;
        if (amountToCheck !== null && Math.abs(amountToCheck - expectedAmount) > 0.01) {
            console.error(
                '[Hubtel Callback] AMOUNT MISMATCH! Expected:',
                expectedAmount,
                'Got:',
                amountToCheck
            );
            return NextResponse.json(
                { success: false, message: 'Payment amount does not match expected charge' },
                { status: 400 }
            );
        }

        const { data: orderJson, error: updateError } = await supabaseAdmin.rpc('mark_order_paid', {
            order_ref: orderNumberForPaid,
            moolre_ref: checkoutId || rawClientReference || 'hubtel-callback',
        });

        if (updateError) {
            console.error('[Hubtel Callback] RPC error:', updateError.message);
            return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
        }
        if (!orderJson) {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        // Annotate + notify off the critical path so Hubtel gets a fast 200
        void (async () => {
            try {
                await supabaseAdmin
                    .from('orders')
                    .update({
                        payment_method: 'hubtel',
                        payment_provider: 'hubtel',
                        metadata: {
                            ...(orderJson.metadata || {}),
                            payment_provider: 'hubtel',
                            hubtel_client_reference: rawClientReference || merchantOrderRef,
                            hubtel_checkout_id: checkoutId || null,
                            hubtel_paid_at: new Date().toISOString(),
                        },
                    })
                    .eq('id', orderJson.id);
            } catch (annotateErr: any) {
                console.warn('[Hubtel Callback] Metadata annotate failed:', annotateErr.message);
            }
            try {
                if (orderJson.email) {
                    await supabaseAdmin.rpc('update_customer_stats', {
                        p_customer_email: orderJson.email,
                        p_order_total: orderJson.total,
                    });
                }
            } catch (e: any) {
                console.error('[Hubtel Callback] Customer stats failed:', e?.message || e);
            }
            try {
                await sendOrderConfirmation(orderJson);
            } catch (e: any) {
                console.error('[Hubtel Callback] Notification failed:', e?.message || e);
            }
        })();

        console.log('[Hubtel Callback] Order updated! ID:', orderJson.id, '| Status:', orderJson.status);
        return NextResponse.json({ success: true, message: 'Payment verified and order updated' });
    } catch (error: any) {
        console.error('[Hubtel Callback] Critical error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Hubtel callback endpoint ready',
        timestamp: new Date().toISOString(),
    });
}
