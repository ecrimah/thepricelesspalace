import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const VALID_TYPES = ['percentage', 'fixed_amount', 'free_shipping'];

function normalizePayload(body: any) {
  const num = (v: any) => (v === '' || v == null ? null : Number(v));
  const out: Record<string, any> = {};
  if (body?.code !== undefined) out.code = String(body.code).trim().toUpperCase();
  if (body?.description !== undefined) out.description = body.description ? String(body.description).trim() : null;
  if (body?.type !== undefined && VALID_TYPES.includes(body.type)) out.type = body.type;
  if (body?.value !== undefined) out.value = Number(body.value) || 0;
  if (body?.minimum_purchase !== undefined) out.minimum_purchase = num(body.minimum_purchase) ?? 0;
  if (body?.maximum_discount !== undefined) out.maximum_discount = num(body.maximum_discount);
  if (body?.usage_limit !== undefined) out.usage_limit = num(body.usage_limit);
  if (body?.per_user_limit !== undefined) out.per_user_limit = num(body.per_user_limit) ?? 1;
  if (body?.start_date !== undefined) out.start_date = body.start_date || null;
  if (body?.end_date !== undefined) out.end_date = body.end_date || null;
  if (body?.is_active !== undefined) out.is_active = body.is_active !== false;
  out.updated_at = new Date().toISOString();
  return out;
}

/** PUT /api/admin/coupons/[id] — update a coupon. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const { id } = await params;
    const payload = normalizePayload(await request.json());

    if (payload.code) {
      const { data: existing } = await supabaseAdmin
        .from('coupons')
        .select('id')
        .ilike('code', payload.code)
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'A coupon with this code already exists.' }, { status: 409 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ coupon: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update coupon' }, { status: 500 });
  }
}

/** DELETE /api/admin/coupons/[id] — delete a coupon. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('coupons').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete coupon' }, { status: 500 });
  }
}
