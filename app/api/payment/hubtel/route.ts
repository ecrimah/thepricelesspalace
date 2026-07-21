import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import {
    initiateHubtelCheckout,
    makeHubtelClientReference,
    normalizeGhPhone,
} from '@/lib/hubtel';

/**
 * Hubtel payment initialization.
 * Starts a Hubtel Online Checkout session and returns the hosted checkout URL.
 *
 * SECURITY: The amount is always taken from the order in the database — never
 * from the client request.
 */
export async function POST(req: Request) {
    try {
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`hubtel:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimitResult.resetIn.toString(),
                    },
                }
            );
        }

        const body = await req.json();
        const { orderId, customerEmail, redirectUrl } = body;

        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderId' }, { status: 400 });
        }

        if (
            !process.env.HUBTEL_API_ID ||
            !process.env.HUBTEL_API_KEY ||
            !process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER
        ) {
            console.error('[Hubtel] Missing credentials (HUBTEL_API_ID / HUBTEL_API_KEY / HUBTEL_MERCHANT_ACCOUNT_NUMBER)');
            return NextResponse.json({ success: false, message: 'Payment gateway configuration error' }, { status: 500 });
        }

        // SECURITY: Always fetch order from DB. Never trust client-supplied amount.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const query = supabaseAdmin
            .from('orders')
            .select('id, order_number, total, email, phone, payment_status, shipping_address, metadata');

        const { data: order, error: orderError } = isUUID
            ? await query.eq('id', orderId).single()
            : await query.eq('order_number', orderId).single();

        if (orderError || !order) {
            console.error('[Hubtel] Order not found:', orderId);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 400 });
        }

        const amount = Number(order.total);
        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
        }

        // Hubtel allows max 2 decimal places.
        const roundedAmount = Math.round(amount * 100) / 100;

        const orderRef = order.order_number || orderId;
        const clientReference = makeHubtelClientReference(orderRef);

        const requestUrl = new URL(req.url);
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

        const defaultRedirectUrl = `${baseUrl}/order-success?order=${orderRef}&payment_success=true`;
        const safeRedirectUrl =
            typeof redirectUrl === 'string' && redirectUrl.startsWith('https://')
                ? redirectUrl
                : defaultRedirectUrl;
        const cancellationUrl = `${baseUrl}/pay/${orderRef}?cancelled=true`;

        const shipping = (order.shipping_address as any) || {};
        const customerName =
            [shipping.firstName, shipping.lastName].filter(Boolean).join(' ').trim() ||
            customerEmail ||
            order.email ||
            'Customer';
        const customerPhone = normalizeGhPhone(order.phone || shipping.phone || '');
        const customerMail = customerEmail || order.email || undefined;

        console.log('[Hubtel] Initiating for order:', orderRef, '| Amount:', roundedAmount, 'GHS', '| Ref:', clientReference);

        // Save Hubtel reference on the order so verify/callback can use it later
        try {
            await supabaseAdmin
                .from('orders')
                .update({
                    payment_method: 'hubtel',
                    metadata: {
                        ...(order.metadata || {}),
                        payment_gateway: 'hubtel',
                        payment_method: 'hubtel',
                        hubtel_client_reference: clientReference,
                        hubtel_initiated_at: new Date().toISOString(),
                    },
                })
                .eq('id', order.id);
        } catch (metaErr) {
            console.warn('[Hubtel] Could not save reference to order:', metaErr);
        }

        const result = await initiateHubtelCheckout({
            totalAmount: roundedAmount,
            description: `Order ${orderRef}`,
            callbackUrl: `${baseUrl}/api/payment/hubtel/callback`,
            returnUrl: safeRedirectUrl,
            cancellationUrl,
            merchantAccountNumber: process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER!,
            clientReference,
            ...(customerName ? { payeeName: customerName } : {}),
            ...(customerPhone ? { payeeMobileNumber: customerPhone } : {}),
            ...(customerMail ? { payeeEmail: customerMail } : {}),
        });

        const checkoutUrl = result?.data?.checkoutUrl || result?.data?.checkoutDirectUrl;
        const checkoutId = result?.data?.checkoutId;

        console.log('[Hubtel] Init response:', checkoutUrl ? 'Success' : 'Failed', '| Has URL:', !!checkoutUrl);

        if (!checkoutUrl) {
            console.error('[Hubtel] No checkout URL in response:', JSON.stringify(result));
            const upstreamMessage =
                result?.message ||
                result?.data?.message ||
                'Failed to generate payment link';
            return NextResponse.json(
                { success: false, message: `Hubtel: ${upstreamMessage}` },
                { status: 502 }
            );
        }

        // Store checkoutId if we got one
        if (checkoutId) {
            try {
                await supabaseAdmin
                    .from('orders')
                    .update({
                        metadata: {
                            ...(order.metadata || {}),
                            payment_gateway: 'hubtel',
                            payment_method: 'hubtel',
                            hubtel_client_reference: clientReference,
                            hubtel_checkout_id: checkoutId,
                            hubtel_initiated_at: new Date().toISOString(),
                        },
                    })
                    .eq('id', order.id);
            } catch {}
        }

        return NextResponse.json({
            success: true,
            url: checkoutUrl,
            checkoutDirectUrl: result?.data?.checkoutDirectUrl || null,
            checkoutId,
            externalRef: clientReference,
            reference: checkoutId || clientReference,
            amount: roundedAmount,
        });
    } catch (error: any) {
        console.error('[Hubtel] API Error:', error?.message || error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
