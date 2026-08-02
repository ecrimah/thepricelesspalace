# Database Recovery Guide — Palace

**Database:** `store_palace` on PostgreSQL 16.14 (`fleet-postgres`, big VPS)  
**Purpose:** Restore, repair, and verify procedures after failure or schema drift

---

## When to use this guide

- Postgres container failure or data corruption
- Accidental migration mis-apply
- Schema drift (app errors referencing missing columns/tables)
- Need to rebuild `store_palace` from backup on a fresh fleet DB

---

## Prerequisites

- SSH access to big VPS: `ssh big-vps`
- Fleet CLI (passwordless sudo for fleet commands): `sudo fleet db list`
- Local repo with canonical migrations: `db/migrations/001`–`004`
- **`DATABASE_URL`** for the target database (never commit or paste into docs)

---

## Quick health check

```bash
# From app host or local with DATABASE_URL set
npm run test:schema

# HTTP (production)
curl -s https://thepricelesspalace.com/api/health/db
```

Degraded health → identify missing objects in `checks` map, apply missing migration section below.

---

## Canonical rebuild (empty database)

Apply in strict order:

```bash
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f db/migrations/001_plain_postgres.sql
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f db/migrations/002_uuid_id_defaults.sql
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f db/migrations/003_product_variants_sort_order.sql
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 -f db/migrations/004_payment_integrity_and_audit.sql
```

Then bootstrap admin:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... DATABASE_URL=... npm run create-admin
```

Optional seed:

```bash
npm run db:seed-products
```

**Do not** apply `supabase/migrations/` to production.

---

## Restore from fleet backup

On big VPS:

```bash
ssh big-vps
sudo fleet db list                    # confirm store_palace exists
ls -la /data/fleet/backups/           # locate latest store_palace dump
```

Restore procedure depends on fleet backup format (typically `pg_dump` custom or plain SQL). General pattern:

```bash
# Example — adjust filename and confirm with fleet docs/README on VPS
pg_restore -U postgres -d store_palace --clean --if-exists /data/fleet/backups/store_palace_YYYYMMDD.dump
```

After restore:

1. Compare applied migrations vs repo (see verification section)
2. Apply any missing `002`–`004` files (idempotent)
3. Run `npm run test:schema`
4. Redeploy Coolify app `palace-app` if env changed

---

## Repair: apply only migration 004

If baseline `001`–`003` are present but payment audit objects are missing:

```bash
# On VPS — see scripts/vps/apply-004.sh
psql -U postgres -d store_palace -v ON_ERROR_STOP=1 \
  -f db/migrations/004_payment_integrity_and_audit.sql
```

Verify:

```sql
SELECT to_regclass('public.payment_attempts');
SELECT to_regclass('public.payment_webhook_events');
SELECT to_regclass('public.sms_messages');
SELECT column_name FROM information_schema.columns
 WHERE table_name='orders' AND column_name='confirmation_sent_at';
```

---

## Rollback migration 004

**Use only** when 004 must be undone and loss of payment/SMS audit data is acceptable. Does **not** revert product quarantine.

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

After rollback, deploy application code compatible with pre-004 schema or expect runtime failures on payment routes.

### Manual quarantine reversal (optional)

If empty products were quarantined and should be restored:

```sql
UPDATE public.products
SET status = 'active',
    metadata = metadata - 'quarantined_empty',
    updated_at = now()
WHERE metadata->>'quarantined_empty' = 'true';
-- Fix name/slug before republishing
```

---

## Repair: missing `confirmation_sent_at` only

If only the column is missing (tables otherwise intact):

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_confirmation_sent_at
  ON public.orders (confirmation_sent_at)
  WHERE confirmation_sent_at IS NULL;
```

Prefer full `004` apply for consistency.

---

## Repair: schema drift detection

`scripts/db-schema-tests.mjs` checks:

| Check | |
|-------|---|
| Tables | orders, order_items, products, product_variants, categories, profiles, payment_attempts, payment_webhook_events, sms_messages |
| Columns | orders.confirmation_sent_at, product_variants.sort_order, orders.payment_status, orders.order_number |
| Constraint | payment_attempts.internal_reference UNIQUE |

Exit code 1 → fix before production traffic.

---

## Application env after recovery

Ensure these are set on Coolify `palace-app` (names only):

| Variable | Required for |
|----------|--------------|
| `DATABASE_URL` | All DB access |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `AUTH_JWT_SECRET` / `JWT_SECRET` | Login sessions |
| `MOOLRE_CALLBACK_SECRET` | Payment callbacks |
| `CRON_SECRET` | Payment reminder cron |
| `NEXT_PUBLIC_APP_URL` | Callback URL construction |
| `STORAGE_ROOT` | Upload paths |

See [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md).

---

## Post-recovery verification checklist

- [ ] `npm run test:schema` passes
- [ ] `GET /api/health/db` → `status: "healthy"`
- [ ] Admin login at `/admin/login`
- [ ] Shop `/shop` loads products
- [ ] Moolre callback GET returns ready; POST without secret → 401
- [ ] Order tracking requires email
- [ ] Uploads served from `/var/www/palace/uploads`

---

## Escalation

| Issue | Action |
|-------|--------|
| `fleet-postgres` container down | VPS admin — restart container via docker/sudo |
| Backup missing or corrupt | Restore from older backup; contact fleet operator |
| Data loss after failed migration | Stop app traffic; restore backup; replay 004 |
| Coolify app won't start | Check deploy logs; verify `DATABASE_URL` |

---

## Related documents

- [`MIGRATION_STATUS_REPORT.md`](MIGRATION_STATUS_REPORT.md) — apply order
- [`DATABASE_AUDIT_AND_REPAIR_REPORT.md`](DATABASE_AUDIT_AND_REPAIR_REPORT.md) — what 004 fixes
- [`PAYMENT_DATABASE_AUDIT.md`](PAYMENT_DATABASE_AUDIT.md) — payment table detail
- [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md) — full cutover
