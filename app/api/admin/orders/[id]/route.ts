import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 });
  }
  const token = getAccessToken(request);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single();
  const role = profile?.role != null ? String(profile.role) : '';
  if (role !== 'admin' && role !== 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

const ORDER_SELECT = `
  *,
  order_items (
    id,
    product_id,
    product_name,
    variant_name,
    sku,
    quantity,
    unit_price,
    total_price,
    metadata,
    products (
      product_images (url)
    )
  )
`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let data: any = null;
    let lastError: any = null;

    const fetchBy = async (column: 'id' | 'order_number', value: string) => {
      const primary = await supabaseAdmin
        .from('orders')
        .select(ORDER_SELECT)
        .eq(column, value)
        .single();
      if (!primary.error && primary.data) return primary.data;

      // Fallback without nested product images (older shim / missing FK edge)
      lastError = primary.error;
      const fallback = await supabaseAdmin
        .from('orders')
        .select(`*, order_items (*)`)
        .eq(column, value)
        .single();
      if (!fallback.error && fallback.data) return fallback.data;
      lastError = fallback.error || lastError;
      return null;
    };

    if (isUUID) data = await fetchBy('id', id);
    if (!data) data = await fetchBy('order_number', id);

    if (!data) {
      return NextResponse.json(
        { error: lastError?.message || 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (e: any) {
    console.error('Admin order detail error:', e);
    return NextResponse.json({ error: e.message || 'Failed to load order' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, notes, metadata } = body;

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status, notes, metadata })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
