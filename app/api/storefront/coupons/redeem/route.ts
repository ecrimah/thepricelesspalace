import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storefront/coupons/redeem
 * Body: { code: string, orderNumber: string }
 * Increments usage only when the order exists, is recent, and references the coupon.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const orderNumber =
      typeof body?.orderNumber === 'string'
        ? body.orderNumber.trim()
        : typeof body?.order_number === 'string'
          ? body.order_number.trim()
          : '';

    if (!code) return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 });
    if (!orderNumber) {
      return NextResponse.json({ ok: false, error: 'Missing orderNumber' }, { status: 400 });
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, created_at, metadata, discount_total')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    const created = order.created_at ? new Date(order.created_at).getTime() : 0;
    if (!created || Date.now() - created > 60 * 60 * 1000) {
      return NextResponse.json({ ok: false, error: 'Order redeem window expired' }, { status: 400 });
    }

    const metaCode = String(order.metadata?.coupon_code || order.metadata?.couponCode || '')
      .trim()
      .toLowerCase();
    if (metaCode && metaCode !== code.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Coupon does not match order' }, { status: 400 });
    }
    if (!metaCode && !(Number(order.discount_total) > 0)) {
      return NextResponse.json({ ok: false, error: 'Order has no coupon' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.rpc('increment_coupon_usage', { p_code: code });
    if (error) {
      console.error('Coupon redeem error:', error.message);
      return NextResponse.json({ ok: false, error: 'Redeem failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Redeem failed' }, { status: 500 });
  }
}
