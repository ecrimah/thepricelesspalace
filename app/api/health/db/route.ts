import { NextResponse } from 'next/server';
import { getPoolStats, query } from '@/lib/db/pool';

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
        { status: 'unhealthy', database: 'misconfigured', checks: {}, pool: getPoolStats() },
        { status: 503 }
      );
    }

    const started = Date.now();
    await query('SELECT 1 AS ok');
    const pingMs = Date.now() - started;

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

    const pool = getPoolStats();
    const allOk = Object.values(checks).every(Boolean);
    const degradedPool =
      pool.initialized && typeof pool.waiting === 'number' && pool.waiting > 0;

    return NextResponse.json(
      {
        status: !allOk || degradedPool ? 'degraded' : 'healthy',
        database: 'connected',
        pingMs,
        checks,
        pool,
      },
      { status: allOk ? 200 : 503 }
    );
  } catch {
    return NextResponse.json(
      { status: 'unhealthy', database: 'unreachable', checks: {}, pool: getPoolStats() },
      { status: 503 }
    );
  }
}
