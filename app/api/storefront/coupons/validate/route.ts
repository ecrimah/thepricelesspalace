import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_purchase: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
};

function computeDiscount(coupon: CouponRow, subtotal: number): number {
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = subtotal * (Number(coupon.value) / 100);
  } else if (coupon.type === 'fixed_amount') {
    discount = Number(coupon.value);
  } else {
    discount = 0; // free_shipping handled on the shipping line
  }
  if (coupon.maximum_discount && discount > coupon.maximum_discount) {
    discount = Number(coupon.maximum_discount);
  }
  if (discount > subtotal) discount = subtotal;
  return Math.round(discount * 100) / 100;
}

function isCurrentlyValid(coupon: CouponRow): { ok: boolean; reason?: string } {
  if (!coupon.is_active) return { ok: false, reason: 'This coupon is no longer active.' };
  const now = Date.now();
  if (coupon.start_date && new Date(coupon.start_date).getTime() > now) {
    return { ok: false, reason: 'This coupon is not active yet.' };
  }
  if (coupon.end_date && new Date(coupon.end_date).getTime() < now) {
    return { ok: false, reason: 'This coupon has expired.' };
  }
  if (coupon.usage_limit != null && (coupon.usage_count ?? 0) >= coupon.usage_limit) {
    return { ok: false, reason: 'This coupon has reached its usage limit.' };
  }
  return { ok: true };
}

/**
 * POST /api/storefront/coupons/validate
 * Body: { code: string, subtotal: number }
 * Validates a coupon against the database and returns the computed discount.
 */
export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ valid: false, error: 'Server misconfiguration' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const subtotal = Number(body?.subtotal) || 0;

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Please enter a coupon code.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('id, code, description, type, value, minimum_purchase, maximum_discount, usage_limit, usage_count, start_date, end_date, is_active')
      .ilike('code', code)
      .limit(1);

    if (error) {
      return NextResponse.json({ valid: false, error: 'Could not validate coupon.' }, { status: 500 });
    }

    const coupon = (data || [])[0] as CouponRow | undefined;
    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code.' }, { status: 200 });
    }

    const validity = isCurrentlyValid(coupon);
    if (!validity.ok) {
      return NextResponse.json({ valid: false, error: validity.reason }, { status: 200 });
    }

    if (coupon.minimum_purchase && subtotal < coupon.minimum_purchase) {
      return NextResponse.json({
        valid: false,
        error: `Minimum purchase of ₵${Number(coupon.minimum_purchase).toFixed(2)} required.`,
      }, { status: 200 });
    }

    const discount = computeDiscount(coupon, subtotal);

    return NextResponse.json({
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minimum_purchase: coupon.minimum_purchase ? Number(coupon.minimum_purchase) : 0,
        maximum_discount: coupon.maximum_discount != null ? Number(coupon.maximum_discount) : null,
        description: coupon.description || '',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e?.message || 'Could not validate coupon.' }, { status: 500 });
  }
}

/**
 * GET /api/storefront/coupons/validate
 * Returns the list of currently-valid public coupons (for the "available coupons" UI).
 */
export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ coupons: [] }, { status: 200 });
  }
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('code, description, type, value, minimum_purchase, maximum_discount, start_date, end_date, is_active, usage_limit, usage_count')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ coupons: [] }, { status: 200 });

    const coupons = (data || [])
      .filter((c: any) => {
        if (c.start_date && c.start_date > nowIso) return false;
        if (c.end_date && c.end_date < nowIso) return false;
        if (c.usage_limit != null && (c.usage_count ?? 0) >= c.usage_limit) return false;
        return true;
      })
      .map((c: any) => ({
        code: c.code,
        description: c.description || '',
        type: c.type,
        value: Number(c.value),
        minimum_purchase: c.minimum_purchase ? Number(c.minimum_purchase) : 0,
        maximum_discount: c.maximum_discount != null ? Number(c.maximum_discount) : null,
      }));

    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ coupons: [] }, { status: 200 });
  }
}
