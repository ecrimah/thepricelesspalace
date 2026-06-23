import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['percentage', 'fixed_amount', 'free_shipping'];

function normalizePayload(body: any) {
  const type = VALID_TYPES.includes(body?.type) ? body.type : 'percentage';
  const num = (v: any) => (v === '' || v == null ? null : Number(v));
  return {
    code: String(body?.code || '').trim().toUpperCase(),
    description: body?.description ? String(body.description).trim() : null,
    type,
    value: Number(body?.value) || 0,
    minimum_purchase: num(body?.minimum_purchase) ?? 0,
    maximum_discount: num(body?.maximum_discount),
    usage_limit: num(body?.usage_limit),
    per_user_limit: num(body?.per_user_limit) ?? 1,
    start_date: body?.start_date || null,
    end_date: body?.end_date || null,
    is_active: body?.is_active !== false,
  };
}

/** GET /api/admin/coupons — list all coupons (service role). */
export async function GET(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupons: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

/** POST /api/admin/coupons — create a coupon. */
export async function POST(request: Request) {
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const payload = normalizePayload(await request.json());
    if (!payload.code) {
      return NextResponse.json({ error: 'Coupon code is required.' }, { status: 400 });
    }
    if (payload.type !== 'free_shipping' && payload.value <= 0) {
      return NextResponse.json({ error: 'Discount value must be greater than 0.' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .ilike('code', payload.code)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert([payload])
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupon: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create coupon' }, { status: 500 });
  }
}
