import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storefront/coupons/redeem
 * Body: { code: string }
 * Increments the coupon usage_count after a successful order.
 * Best-effort: never blocks the checkout flow.
 */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 });

    const { error } = await supabaseAdmin.rpc('increment_coupon_usage', { p_code: code });
    if (error) {
      console.error('Coupon redeem error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Redeem failed' }, { status: 500 });
  }
}
