/**
 * Schema presence tests against DATABASE_URL / POSTGRES_URL.
 * Run: node scripts/db-schema-tests.mjs
 */
import pg from 'pg';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('FAIL: DATABASE_URL or POSTGRES_URL required');
  process.exit(1);
}

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

const requiredColumns = [
  ['orders', 'confirmation_sent_at'],
  ['product_variants', 'sort_order'],
  ['orders', 'payment_status'],
  ['orders', 'order_number'],
];

let failed = 0;
function ok(name) {
  console.log(`  ok  ${name}`);
}
function fail(name, detail) {
  failed += 1;
  console.error(`  FAIL ${name}: ${detail}`);
}

const client = new pg.Client({
  connectionString: url,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
});

await client.connect();
console.log('Schema tests');

for (const t of requiredTables) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [t]
  );
  if (r.rowCount) ok(`table ${t}`);
  else fail(`table ${t}`, 'missing');
}

for (const [table, col] of requiredColumns) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  );
  if (r.rowCount) ok(`column ${table}.${col}`);
  else fail(`column ${table}.${col}`, 'missing');
}

const uq = await client.query(
  `SELECT 1 FROM pg_constraint WHERE conname='payment_attempts_internal_reference_key'`
);
if (uq.rowCount) ok('unique payment_attempts.internal_reference');
else fail('unique payment_attempts.internal_reference', 'missing');

await client.end();
process.exit(failed ? 1 : 0);
