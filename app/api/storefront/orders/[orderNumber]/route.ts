import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public order lookup — requires matching email (same contract as get_order_for_tracking).
 * Does not return full PII dump without proof of ownership.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const email = new URL(request.url).searchParams.get('email')?.trim().toLowerCase() || '';

  if (!orderNumber) {
    return NextResponse.json({ error: 'Order number required' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_order_for_tracking', {
      p_order_number: orderNumber,
      p_email: email,
    });

    if (error) {
      console.error('Order fetch error:', error.message);
      return NextResponse.json({ error: 'Unable to look up order' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (e: any) {
    console.error('Order fetch error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
