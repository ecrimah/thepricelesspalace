# Database Performance and Lock Report

## Connection architecture

- Single module-level `Pool` in `lib/db/pool.ts`
- Default `PG_POOL_MAX=10`
- `connectionTimeoutMillis=10000`
- `idleTimeoutMillis=30000`
- On connect: `statement_timeout=15s`, `lock_timeout=5s`, `idle_in_transaction_session_timeout=30s`
- JS `query_timeout=15s`

## Leaks / transactions

- No per-request `new Pool` / `new Client` found
- Compat layer uses pool.query (auto release)
- Payment/SMS must not run inside open transactions (existing pattern preserved via `payment-audit`)

## Indexes added (live `store_palace`)

- `idx_orders_payment_status_created_at`
- `idx_orders_created_at`
- `idx_orders_email` (already existed)
- `idx_products_quantity` (partial `quantity < 10`)
- `idx_product_images_product_position`

## Slow query before/after (dashboard aggregate)

| Query | Before | After |
|-------|--------|-------|
| Paid revenue COUNT/SUM over orders | Client full table download | SQL aggregate ~0.1ms on 6 rows |

## Health

`GET /api/health/db` now includes `pingMs` + pool stats (`total/idle/waiting/max`).
