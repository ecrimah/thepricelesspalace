import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

/**
 * Safe DB health check — no credentials, hosts, or row data exposed.
 */
export async function GET() {
  const requiredTables = [
    'orders',
    'order_items',
    'products',
    'product_variants',
    'categories',
    'profiles',
    'payment_attempts',
    'payment_webhook_events',
    'sms_messages',
  ];

  try {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      return NextResponse.json(
        { status: 'unhealthy', database: 'misconfigured', checks: {} },
        { status: 503 }
      );
    }

    await query('SELECT 1 AS ok');

    const { rows } = await query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])`,
      [requiredTables]
    );
    const present = new Set(rows.map((r) => r.table_name));
    const checks: Record<string, boolean> = {};
    for (const t of requiredTables) checks[t] = present.has(t);

    const { rows: colRows } = await query<{ ok: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='orders' AND column_name='confirmation_sent_at'
       ) AS ok`
    );
    checks['orders.confirmation_sent_at'] = !!colRows[0]?.ok;

    const { rows: sortRows } = await query<{ ok: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='product_variants' AND column_name='sort_order'
       ) AS ok`
    );
    checks['product_variants.sort_order'] = !!sortRows[0]?.ok;

    const allOk = Object.values(checks).every(Boolean);
    return NextResponse.json(
      {
        status: allOk ? 'healthy' : 'degraded',
        database: 'connected',
        checks,
      },
      { status: allOk ? 200 : 503 }
    );
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', database: 'unreachable', checks: {} },
      { status: 503 }
    );
  }
}
