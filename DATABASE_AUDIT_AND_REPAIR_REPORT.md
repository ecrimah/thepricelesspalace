# Database Audit and Repair Report — Palace

**Store:** Priceless Palace (`store_palace`)  
**Engine:** PostgreSQL 16.14 on `fleet-postgres` (big VPS)  
**Audit date:** August 2026  
**Scope:** Pre-004 live baseline, schema/code drift, repairs in migration 004 and application hardening

---

## Executive summary

The live `store_palace` database was cut over from Supabase to plain Postgres with a healthy core schema (45 tables, no orphan FKs, no duplicate `order_number` or product `slug` values). Several columns and tables expected by application code were missing. Migration `004_payment_integrity_and_audit.sql` closes that gap, adds payment/SMS audit tables, enforces financial sanity checks, and quarantines two empty product shells. Companion code changes enforce secrets, tighten public APIs, and block sensitive REST reads for non-admins.

---

## Architecture (verified)

| Item | Detail |
|------|--------|
| Database | `store_palace` on PostgreSQL 16.14 (`fleet-postgres` container on big VPS) |
| ORM | None — single `pg` Pool via `lib/db/pool.ts` |
| Data layer | Supabase-compat shims: `lib/db/supabase-compat.ts`, `lib/db/http-client.ts`, `lib/supabase-admin.ts` |
| Auth | JWT (`jose`) + `auth.users` + `profiles.role`; RLS replaced by `lib/db/rest-guard.ts` |
| Runtime Supabase packages | **Zero** `@supabase/*` in `package.json` |
| Canonical migrations | `db/migrations/001`–`004` only |
| Legacy (non-canonical) | `supabase/migrations/` — historical reference, do not apply to production |

---

## Live baseline (pre-004)

### Table inventory

- **45 tables total:** `auth.users` + **44** `public` tables (see `DATABASE_SCHEMA_REFERENCE.md`)
- **Row counts (sample):** 48 products, 5 orders, 19 product variants

### Schema drift (code expected, DB lacked)

| Object | Issue |
|--------|-------|
| `orders.confirmation_sent_at` | Application wrote this column; column did not exist after cutover |
| `payment_attempts` | Table missing |
| `payment_webhook_events` | Table missing |
| `sms_messages` | Table missing |

### Already present (no action in 004)

| Object | Status |
|--------|--------|
| `product_variants.sort_order` | Present (added via `003_product_variants_sort_order.sql` or included in refreshed `001`) |

### Data quality

| Check | Result |
|-------|--------|
| Orphan foreign keys | None found |
| Duplicate `orders.order_number` | None |
| Duplicate `products.slug` | None |
| Empty product names | **2** rows |
| Empty product slugs | **1** row (overlap with empty names possible) |

Empty products were **not deleted**; migration 004 sets `status = 'draft'` and flags `metadata.quarantined_empty = true`.

---

## Repairs in 004

File: [`db/migrations/004_payment_integrity_and_audit.sql`](db/migrations/004_payment_integrity_and_audit.sql)

1. **`orders.confirmation_sent_at`** — `timestamptz` column + partial index for unsent confirmations
2. **`payment_attempts`** — gateway-agnostic attempt log with idempotency and status lifecycle
3. **`payment_webhook_events`** — webhook deduplication by `(gateway, external_event_id)` and `(gateway, payload_hash)`
4. **`sms_messages`** — SMS audit/idempotency with masked recipient fields
5. **Check constraints** (added `NOT VALID` then validated): non-negative `orders.total`, positive `order_items.quantity`, non-negative prices
6. **Product quarantine** — empty name/slug products moved to `draft`

All DDL is idempotent (`IF NOT EXISTS`, guarded constraint blocks).

---

## Application repairs (paired with 004)

| Area | Change |
|------|--------|
| **Moolre** | Requires `MOOLRE_CALLBACK_SECRET`; records webhook events and payment attempts via `lib/payment-audit.ts`; finalizes attempt status after verification |
| **Storefront order lookup** | `GET /api/storefront/orders/[orderNumber]` requires `email` query param; uses `get_order_for_tracking` RPC |
| **Pay API** | `GET /api/storefront/pay/[orderId]` uses `products.quantity` (not a nonexistent `stock` column); redacts payload when order already paid |
| **Coupon redeem** | `POST /api/storefront/coupons/redeem` requires `orderNumber` + coupon must match order metadata |
| **Support APIs** | Admin required (`requireAdmin`) except `POST /api/support/feedback` (public insert) |
| **Cron** | `GET /api/cron/payment-reminders` requires `Authorization: Bearer <CRON_SECRET>` |
| **REST guard** | Non-admin reads blocked for `payment_*`, `sms_messages`, `audit_logs` |
| **Health** | `GET /api/health/db` — connectivity + required tables/columns (no secrets exposed) |
| **Tests** | `npm run test:schema` → `scripts/db-schema-tests.mjs` |

---

## Migration apply order

Apply sequentially against `store_palace`:

```text
1. db/migrations/001_plain_postgres.sql
2. db/migrations/002_uuid_id_defaults.sql
3. db/migrations/003_product_variants_sort_order.sql
4. db/migrations/004_payment_integrity_and_audit.sql
```

Example (on VPS, after copying SQL into the postgres container):

```bash
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f /path/to/004_payment_integrity_and_audit.sql
```

See [`scripts/vps/apply-004.sh`](scripts/vps/apply-004.sh) for a fleet-postgres deployment helper.

---

## Rollback notes for 004

**Warning:** Rolling back drops audit history. Product quarantine is a data UPDATE — rollback SQL does not restore previous `status` values.

```sql
BEGIN;

-- Drop dependent tables first (FK order)
DROP TABLE IF EXISTS public.sms_messages;
DROP TABLE IF EXISTS public.payment_webhook_events;
DROP TABLE IF EXISTS public.payment_attempts;

-- Column + index
DROP INDEX IF EXISTS public.idx_orders_confirmation_sent_at;
ALTER TABLE public.orders DROP COLUMN IF EXISTS confirmation_sent_at;

-- Check constraints (optional rollback)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_nonneg;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_qty_positive;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_unit_price_nonneg;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_nonneg;

COMMIT;
```

After rollback, redeploy application code that expects 004 objects, or runtime errors will occur.

---

## Verification checklist

```bash
# Schema tests (requires DATABASE_URL or POSTGRES_URL)
npm run test:schema

# HTTP health (production or local)
curl -s https://thepricelesspalace.com/api/health/db | jq .
```

Expected health checks: all required tables present, `orders.confirmation_sent_at` and `product_variants.sort_order` true.

---

## Related documents

- [`DATABASE_SCHEMA_REFERENCE.md`](DATABASE_SCHEMA_REFERENCE.md) — table summaries
- [`MIGRATION_STATUS_REPORT.md`](MIGRATION_STATUS_REPORT.md) — migration state
- [`PAYMENT_DATABASE_AUDIT.md`](PAYMENT_DATABASE_AUDIT.md) — payment tables detail
- [`DATABASE_RECOVERY_GUIDE.md`](DATABASE_RECOVERY_GUIDE.md) — restore and repair procedures
- [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md) — cutover playbook
