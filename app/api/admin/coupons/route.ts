import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function getAccessToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7).trim();
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/\bsb-access-token=([^;]+)/);
  if (match) return decodeURIComponent(match[1].trim());
  const authCookie = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('sb-') && (c.includes('-auth-token') || c.includes('auth')));
  if (!authCookie) return null;
  const value = authCookie.split('=').slice(1).join('=').trim();
  const decoded = decodeURIComponent(value);
  try {
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    if (parsed?.access_token) return parsed.access_token;
    if (typeof parsed === 'string') return parsed;
  } catch {
    return decoded;
  }
  return null;
}

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 });
  }
  const token = getAccessToken(request);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const role = profile?.role != null ? String(profile.role) : '';
  if (role !== 'admin' && role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

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
