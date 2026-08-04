import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { query } from '@/lib/db/pool';

/**
 * GET /api/admin/dashboard
 * Aggregated KPIs via SQL — never load the full orders table into the browser.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const started = Date.now();

  try {
    const [totals, chart, recent, lowStock, topProducts] = await Promise.all([
      query<{
        total_orders: number;
        paid_orders: number;
        total_revenue: number;
        unique_customers: number;
      }>(`
        SELECT
          COUNT(*)::int AS total_orders,
          COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid_orders,
          COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0)::float AS total_revenue,
          COUNT(DISTINCT email) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS unique_customers
        FROM orders
      `),
      query<{ day: string; revenue: number }>(`
        SELECT
          (created_at AT TIME ZONE 'UTC')::date::text AS day,
          COALESCE(SUM(total), 0)::float AS revenue
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at >= (NOW() - INTERVAL '7 days')
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      query<{
        id: string;
        order_number: string;
        user_id: string | null;
        email: string;
        created_at: string;
        total: number;
        status: string;
        shipping_address: unknown;
      }>(`
        SELECT id, order_number, user_id, email, created_at, total, status, shipping_address
        FROM orders
        WHERE payment_status = 'paid'
        ORDER BY created_at DESC
        LIMIT 5
      `),
      query<{ name: string; quantity: number }>(`
        SELECT name, quantity
        FROM products
        WHERE quantity < 10
        ORDER BY quantity ASC
        LIMIT 5
      `),
      query<{
        id: string;
        slug: string;
        name: string;
        quantity: number;
        image: string | null;
      }>(`
        SELECT
          p.id,
          p.slug,
          p.name,
          p.quantity,
          (
            SELECT pi.url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.position ASC NULLS LAST, pi.created_at ASC
            LIMIT 1
          ) AS image
        FROM products p
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
        LIMIT 4
      `),
    ]);

    const t = totals.rows[0] || {
      total_orders: 0,
      paid_orders: 0,
      total_revenue: 0,
      unique_customers: 0,
    };
    const paidCount = t.paid_orders || 0;
    const revenue = Number(t.total_revenue) || 0;
    const avgOrderValue = paidCount > 0 ? revenue / paidCount : 0;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    const chartMap = new Map(chart.rows.map((r) => [r.day, Number(r.revenue) || 0]));
    const chartData = last7Days.map((day) => ({
      date: new Date(day + 'T00:00:00Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      revenue: chartMap.get(day) || 0,
    }));

    const recentOrders = recent.rows.map((o) => {
      const addr = (o.shipping_address || {}) as Record<string, string>;
      const customerName =
        addr.firstName && addr.lastName
          ? `${String(addr.firstName).trim()} ${String(addr.lastName).trim()}`
          : addr.full_name || addr.firstName || (o.email || '').split('@')[0] || 'Customer';
      return {
        id: o.id,
        displayId: o.order_number,
        customer: customerName,
        email: o.email,
        date: new Date(o.created_at).toLocaleDateString(),
        total: o.total,
        status: o.status,
        items: 1,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenue: revenue,
          totalOrders: t.total_orders || 0,
          uniqueCustomers: t.unique_customers || 0,
          avgOrderValue,
        },
        chartData,
        recentOrders,
        lowStockProducts: lowStock.rows.map((p) => ({
          name: p.name,
          stock: p.quantity,
          status: p.quantity === 0 ? 'critical' : 'low',
        })),
        topProducts: topProducts.rows.map((p) => ({
          id: p.slug,
          name: p.name,
          image: p.image || '',
          sales: 0,
          revenue: 0,
          stock: p.quantity,
        })),
      },
      meta: { durationMs: Date.now() - started },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Dashboard query failed';
    console.error('[admin/dashboard]', message);
    return NextResponse.json(
      { success: false, error: { code: 'DASHBOARD_FAILED', message: 'Unable to load dashboard statistics' } },
      { status: 500 }
    );
  }
}
