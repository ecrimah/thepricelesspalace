import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin(request);
  if (err) return err;

  const { id } = await params;

  try {
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, payment_status, metadata, email, total, phone, shipping_address, created_at, status')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, alreadyPaid: true, order });
    }

    const orderRef = order.order_number || id;
    const { data: orderJson, error: rpcError } = await supabaseAdmin.rpc('mark_order_paid', {
      order_ref: orderRef,
      moolre_ref: `manual-${Date.now()}`,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const paidOrder = orderJson || order;

    try {
      await supabaseAdmin
        .from('orders')
        .update({
          metadata: {
            ...(paidOrder.metadata || order.metadata || {}),
            manually_marked_paid: true,
            payment_provider: 'manual',
          },
        })
        .eq('id', id);
    } catch {
      /* best-effort annotate */
    }

    try {
      await sendOrderConfirmation({ ...order, ...paidOrder, id });
    } catch (notifyErr: any) {
      console.error('[mark-paid] notification failed:', notifyErr?.message);
    }

    return NextResponse.json({ success: true, order: paidOrder });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
