import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const isValidUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

type CartLine = {
  id: string;
  name?: string;
  slug?: string;
  image?: string;
  variant?: string;
  variantId?: string;
  quantity: number;
  price?: number;
};

/**
 * Server-authoritative checkout.
 * Client totals are ignored; unit prices come from products / product_variants.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      phone,
      deliveryMethod = 'pickup',
      paymentMethod = 'moolre',
      shippingData,
      cart,
      couponCode,
    } = body as {
      userId?: string | null;
      email?: string;
      phone?: string;
      deliveryMethod?: string;
      paymentMethod?: string;
      shippingData?: any;
      cart?: CartLine[];
      couponCode?: string | null;
    };

    if (!cart?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!shippingData?.email || !shippingData?.phone || !shippingData?.firstName) {
      return NextResponse.json({ error: 'Missing shipping details' }, { status: 400 });
    }

    // Hubtel / Paystack temporarily disabled — only Moolre online checkout
    const allowedPayments = new Set(['moolre', 'cash', 'pos' /* , 'hubtel', 'paystack' */]);
    if (!allowedPayments.has(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Resolve product IDs (UUID or slug)
    const resolvedLines: Array<{
      productId: string;
      variantId?: string | null;
      name: string;
      slug?: string;
      image?: string;
      variantName?: string | null;
      quantity: number;
      unitPrice: number;
      metadata: Record<string, unknown>;
    }> = [];

    for (const item of cart) {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      let productId = item.id;
      let productRow: any = null;

      if (isValidUUID(productId)) {
        const { data } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, price, quantity, status, metadata')
          .eq('id', productId)
          .single();
        productRow = data;
      } else {
        const { data } = await supabaseAdmin
          .from('products')
          .select('id, name, slug, price, quantity, status, metadata')
          .eq('slug', productId)
          .single();
        productRow = data;
        if (productRow) productId = productRow.id;
      }

      if (!productRow || productRow.status !== 'active') {
        return NextResponse.json(
          { error: `Product not available: ${item.name || item.id}` },
          { status: 400 }
        );
      }

      let unitPrice = Number(productRow.price) || 0;
      let variantName = item.variant || null;

      if (item.variantId && isValidUUID(item.variantId)) {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('id, name, price, quantity, product_id')
          .eq('id', item.variantId)
          .single();
        if (variant && variant.product_id === productId) {
          unitPrice = Number(variant.price) || unitPrice;
          variantName = variant.name || variantName;
        }
      }

      if (unitPrice < 0) {
        return NextResponse.json({ error: 'Invalid product price' }, { status: 400 });
      }

      resolvedLines.push({
        productId,
        variantId: item.variantId || null,
        name: productRow.name,
        slug: productRow.slug,
        image: item.image,
        variantName,
        quantity: qty,
        unitPrice,
        metadata: {
          image: item.image,
          slug: productRow.slug,
          preorder_shipping: productRow.metadata?.preorder_shipping || null,
          variant_id: item.variantId || null,
        },
      });
    }

    let subtotal = resolvedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    subtotal = Math.round(subtotal * 100) / 100;

    let discountTotal = 0;
    let appliedCouponCode: string | null = null;
    if (couponCode && typeof couponCode === 'string') {
      const code = couponCode.trim().toUpperCase();
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (coupon) {
        const status = String(coupon.status ?? coupon.is_active ?? 'active').toLowerCase();
        const active = status === 'active' || status === 'true' || coupon.is_active === true;
        const now = Date.now();
        const startsOk = !coupon.starts_at || new Date(coupon.starts_at).getTime() <= now;
        const endsOk = !coupon.ends_at || new Date(coupon.ends_at).getTime() >= now;
        if (active && startsOk && endsOk) {
          if (coupon.type === 'percent' || coupon.discount_type === 'percentage') {
            discountTotal = (subtotal * Number(coupon.value || coupon.discount_value || 0)) / 100;
          } else {
            discountTotal = Number(coupon.value || coupon.discount_value || 0);
          }
          discountTotal = Math.min(subtotal, Math.max(0, Math.round(discountTotal * 100) / 100));
          appliedCouponCode = coupon.code;
        }
      }
    }

    const shippingTotal = 0;
    const taxTotal = 0;
    const total = Math.max(0, Math.round((subtotal - discountTotal + shippingTotal + taxTotal) * 100) / 100);

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const trackingId = Array.from({ length: 6 }, () =>
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('');
    const trackingNumber = `ORD-${trackingId}`;

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          user_id: userId || null,
          email: shippingData.email || email,
          phone: shippingData.phone || phone,
          status: 'pending',
          payment_status: 'pending',
          currency: 'GHS',
          subtotal,
          tax_total: taxTotal,
          shipping_total: shippingTotal,
          discount_total: discountTotal,
          total,
          shipping_method: deliveryMethod,
          payment_method: paymentMethod,
          payment_provider: paymentMethod,
          shipping_address: shippingData,
          billing_address: shippingData,
          metadata: {
            guest_checkout: !userId,
            first_name: shippingData.firstName,
            last_name: shippingData.lastName,
            tracking_number: trackingNumber,
            coupon_code: appliedCouponCode,
            coupon_discount: discountTotal || null,
            priced_server_side: true,
          },
        },
      ])
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order insert error:', orderError);
      return NextResponse.json({ error: orderError?.message || 'Failed to create order' }, { status: 500 });
    }

    const orderItems = resolvedLines.map((l) => ({
      order_id: order.id,
      product_id: l.productId,
      product_name: l.name,
      variant_name: l.variantName,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total_price: Math.round(l.unitPrice * l.quantity * 100) / 100,
      metadata: l.metadata,
    }));

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
    if (itemsError) {
      console.error('Order items insert error:', itemsError);
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    if (appliedCouponCode) {
      try {
        await supabaseAdmin.rpc('increment_coupon_usage', { p_code: appliedCouponCode });
      } catch (e: any) {
        console.warn('Coupon redeem warning:', e?.message);
      }
    }

    const fullName = `${shippingData.firstName || ''} ${shippingData.lastName || ''}`.trim();
    try {
      await supabaseAdmin.rpc('upsert_customer_from_order', {
        p_email: shippingData.email,
        p_phone: shippingData.phone,
        p_full_name: fullName,
        p_first_name: shippingData.firstName,
        p_last_name: shippingData.lastName,
        p_user_id: userId || null,
        p_address: shippingData,
      });
    } catch (e: any) {
      console.warn('upsert_customer_from_order warning:', e?.message);
    }

    return NextResponse.json({
      order,
      orderNumber,
      trackingNumber,
      totals: { subtotal, discountTotal, shippingTotal, taxTotal, total },
    });
  } catch (e: any) {
    console.error('Checkout API error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
