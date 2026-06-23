import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { getMoolreConfig, generatePaymentLink } from '@/lib/moolre';

/**
 * Moolre payment initialization.
 * Generates a hosted Moolre payment link and returns its URL for redirect.
 *
 * SECURITY: The amount is always taken from the order in the database — never
 * from the client request.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`payment:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimitResult.resetIn.toString()
                    }
                }
            );
        }

        const body = await req.json();
        const { orderId, customerEmail } = body;

        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderId' }, { status: 400 });
        }

        const cfg = getMoolreConfig();
        if (!cfg) {
            console.error('[Moolre] Missing Moolre configuration (MOOLRE_API_USER / MOOLRE_API_PUBKEY / MOOLRE_ACCOUNT_NUMBER)');
            return NextResponse.json({ success: false, message: 'Payment gateway configuration error' }, { status: 500 });
        }

        // SECURITY: Always fetch order from DB. Never trust client-supplied amount.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const query = supabaseAdmin
            .from('orders')
            .select('id, order_number, total, email, payment_status, metadata');

        const { data: order, error: orderError } = isUUID
            ? await query.eq('id', orderId).single()
            : await query.eq('order_number', orderId).single();

        if (orderError || !order) {
            console.error('[Moolre] Order not found:', orderId);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 400 });
        }

        const amount = Number(order.total);
        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
        }

        const orderRef = order.order_number || orderId;
        const email = customerEmail || order.email;

        if (!email) {
            return NextResponse.json({ success: false, message: 'Customer email is required' }, { status: 400 });
        }

        const requestUrl = new URL(req.url);
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

        // Unique reference per attempt so retries don't collide with a prior one
        const uniqueRef = `${orderRef}-R${Date.now()}`;

        // Webhook URL is protected by a shared secret query param (defence in depth;
        // the callback also re-verifies via Moolre's status API).
        const callbackSecret = process.env.MOOLRE_CALLBACK_SECRET || '';
        const callbackUrl = `${baseUrl}/api/payment/moolre/callback${callbackSecret ? `?s=${encodeURIComponent(callbackSecret)}` : ''}`;
        const redirectUrl = `${baseUrl}/order-success?order=${orderRef}&payment_success=true`;

        console.log('[Moolre] Initializing for order:', orderRef, '| Amount:', amount, 'GHS', '| Ref:', uniqueRef);

        // Save Moolre reference on the order so verify/callback can use it later
        try {
            await supabaseAdmin
                .from('orders')
                .update({
                    payment_method: 'moolre',
                    metadata: {
                        ...(order.metadata || {}),
                        moolre_reference: uniqueRef,
                        moolre_init_at: new Date().toISOString(),
                    }
                })
                .eq('id', order.id);
        } catch (metaErr) {
            console.warn('[Moolre] Could not save reference to order:', metaErr);
        }

        const result = await generatePaymentLink({
            cfg,
            amount,
            email,
            externalRef: uniqueRef,
            callbackUrl,
            redirectUrl,
            metadata: {
                order_number: orderRef,
                order_id: order.id,
                customer_email: email,
            },
        });

        console.log('[Moolre] Init response:', result.ok ? 'Success' : 'Failed', '| Has URL:', !!result.url);

        if (result.ok && result.url) {
            return NextResponse.json({
                success: true,
                url: result.url,
                reference: result.reference || uniqueRef,
            });
        }

        console.error('[Moolre] Init failed:', result.message);
        return NextResponse.json({
            success: false,
            message: result.message || 'Failed to generate payment link'
        }, { status: 400 });

    } catch (error: any) {
        console.error('[Moolre] API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
