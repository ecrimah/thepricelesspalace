# Migration Status Report — Palace

**Database:** `store_palace` on PostgreSQL 16.14 (`fleet-postgres`, big VPS)  
**Application branch:** `staging/plain-postgres`  
**Last updated:** August 2026

---

## Canonical migration chain

Only files under `db/migrations/` are authoritative for production.

| # | File | Status | Purpose |
|---|------|--------|---------|
| 001 | `001_plain_postgres.sql` | **Required** | Full schema: auth, catalog, orders, CMS, support, delivery, indexes, RPCs. No RLS. |
| 002 | `002_uuid_id_defaults.sql` | **Required** | `pgcrypto` + `gen_random_uuid()` defaults on public UUID `id` columns missing defaults |
| 003 | `003_product_variants_sort_order.sql` | **Required** | `product_variants.sort_order` + composite index (idempotent if 001 already includes column) |
| 004 | `004_payment_integrity_and_audit.sql` | **Required (2026 audit)** | Payment/SMS audit tables, `confirmation_sent_at`, check constraints, product quarantine |

### Apply order

```text
001 → 002 → 003 → 004
```

Never skip numbers on a fresh database. On an existing cutover DB, run only migrations not yet applied (each file is idempotent where noted).

### Apply example

```bash
export PGDATABASE=store_palace
psql -v ON_ERROR_STOP=1 -f db/migrations/001_plain_postgres.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/002_uuid_id_defaults.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/003_product_variants_sort_order.sql
psql -v ON_ERROR_STOP=1 -f db/migrations/004_payment_integrity_and_audit.sql
```

VPS helper: [`scripts/vps/apply-004.sh`](scripts/vps/apply-004.sh)

---

## Non-canonical migrations

| Location | Status |
|----------|--------|
| `supabase/migrations/` | **Legacy / reference only** — do not apply to `store_palace` |

The Supabase-era SQL may differ from `001` (extra tables, RLS policies). Production follows `db/migrations/` exclusively.

---

## Environment prerequisites

Set together for plain Postgres mode (see [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md)):

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Postgres connection string for `store_palace` |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | App origin (shim base URL), not `*.supabase.co` |
| `AUTH_JWT_SECRET` / `JWT_SECRET` | Token signing |
| `MOOLRE_CALLBACK_SECRET` | Required for Moolre init + callback |
| `CRON_SECRET` | Required for payment reminder cron |

Variable names only — never commit credentials.

---

## Cutover timeline (summary)

| Phase | State |
|-------|-------|
| Supabase hosted | Deprecated |
| Plain Postgres cutover | `001` + `002` applied; app on compat shims |
| Variant ordering | `003` applied (or column present from refreshed `001`) |
| Payment integrity audit | `004` + API hardening (August 2026) |

---

## Pre-004 vs post-004 schema delta

| Object | Pre-004 | Post-004 |
|--------|---------|----------|
| Table count | 45 total (auth.users + 44 public) | 48 total (auth.users + 47 public) |
| `orders.confirmation_sent_at` | Missing | Present |
| `payment_attempts` | Missing | Present |
| `payment_webhook_events` | Missing | Present |
| `sms_messages` | Missing | Present |
| Financial check constraints | Absent | Present |
| Empty products (2 name / 1 slug) | Active/invalid | Quarantined to `draft` |

---

## Verification

```bash
# Automated schema presence
npm run test:schema

# HTTP health endpoint
curl -s "$BASE/api/health/db"
```

`test:schema` checks: required tables, `orders.confirmation_sent_at`, `product_variants.sort_order`, `payment_attempts.internal_reference` unique constraint.

---

## Rollback: migration 004 only

Use only if 004 must be reversed and audit data loss is acceptable.

```sql
BEGIN;
DROP TABLE IF EXISTS public.sms_messages;
DROP TABLE IF EXISTS public.payment_webhook_events;
DROP TABLE IF EXISTS public.payment_attempts;
DROP INDEX IF EXISTS public.idx_orders_confirmation_sent_at;
ALTER TABLE public.orders DROP COLUMN IF EXISTS confirmation_sent_at;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_total_nonneg;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_qty_positive;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_unit_price_nonneg;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_nonneg;
COMMIT;
```

**Not reversed by SQL:** product quarantine (`status = 'draft'`, `metadata.quarantined_empty`). Restore manually if needed.

Rolling back **001** on a live store is not supported — use backup restore instead ([`DATABASE_RECOVERY_GUIDE.md`](DATABASE_RECOVERY_GUIDE.md)).

---

## Related documents

- [`DATABASE_AUDIT_AND_REPAIR_REPORT.md`](DATABASE_AUDIT_AND_REPAIR_REPORT.md)
- [`SUPABASE_TO_POSTGRES_DATABASE_REPORT.md`](SUPABASE_TO_POSTGRES_DATABASE_REPORT.md)
- [`DATABASE_RECOVERY_GUIDE.md`](DATABASE_RECOVERY_GUIDE.md)
