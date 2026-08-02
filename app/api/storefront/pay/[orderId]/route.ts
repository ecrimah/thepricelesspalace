import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Payment page order loader.
 * Returns only fields needed to complete payment (not full admin dump).
 * Uses products.quantity (not nonexistent "stock").
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_number, email, phone, status, payment_status, currency, total, subtotal, shipping_total, discount_total, payment_method, payment_provider, shipping_method, shipping_address, created_at, metadata, order_items(id, product_id, product_name, variant_name, quantity, unit_price, metadata)'
      )
      .or(isUUID ? `id.eq.${orderId}` : `order_number.eq.${orderId}`)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Already paid — do not expose a re-payable checkout payload
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        order: {
          id: order.id,
          order_number: order.order_number,
          payment_status: order.payment_status,
          status: order.status,
          total: order.total,
          currency: order.currency,
        },
        stockValid: true,
        outOfStockItems: [],
        alreadyPaid: true,
      });
    }

    const outOfStockItems: string[] = [];

    if (order.order_items?.length) {
      for (const item of order.order_items) {
        if (!item.product_id) continue;

        const { data: product } = await supabaseAdmin
          .from('products')
          .select('quantity, status, name, track_quantity, continue_selling')
          .eq('id', item.product_id)
          .single();

        if (!product) {
          outOfStockItems.push(item.product_name || 'Unknown product');
          continue;
        }

        if (product.status && product.status !== 'active') {
          outOfStockItems.push(item.product_name);
          continue;
        }

        if (product.continue_selling || product.track_quantity === false) continue;

        const variantId = item.metadata?.variant_id;
        if (variantId) {
          const { data: variant } = await supabaseAdmin
            .from('product_variants')
            .select('quantity')
            .eq('id', variantId)
            .single();

          if (variant && typeof variant.quantity === 'number' && variant.quantity < item.quantity) {
            outOfStockItems.push(
              `${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}`
            );
            continue;
          }
        }

        if (typeof product.quantity === 'number' && product.quantity < item.quantity) {
          outOfStockItems.push(item.product_name);
        }
      }
    }

    return NextResponse.json({
      order,
      stockValid: outOfStockItems.length === 0,
      outOfStockItems,
      alreadyPaid: false,
    });
  } catch (err: any) {
    console.error('[Pay API] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
