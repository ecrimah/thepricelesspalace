# Supabase to Postgres Database Report — Palace

**Project:** Priceless Palace  
**Database:** `store_palace`  
**Postgres:** 16.14 on `fleet-postgres` (big VPS)  
**Cutover model:** Shape A — zero `@supabase/*` runtime; HTTP + REST shims over plain Postgres

---

## Summary

Palace completed migration from hosted Supabase to fleet-managed plain Postgres. The database retains Supabase-shaped schemas (`auth.users`, PostgREST-style RPC names) but **no Row Level Security** and **no Supabase client libraries** at runtime. All data access flows through a single `pg` connection pool and compatibility layers that preserve existing application call patterns.

---

## Before and after

| Aspect | Supabase (before) | Plain Postgres (after) |
|--------|-------------------|------------------------|
| Database host | Supabase project | `store_palace` on `fleet-postgres` |
| Client SDK | `@supabase/supabase-js` | `lib/db/http-client.ts` + `lib/db/supabase-compat.ts` |
| Admin client | Supabase service role | `lib/supabase-admin.ts` → compat layer |
| Auth | Supabase Auth | JWT (`jose`) + `auth.users` + `/auth/v1` shim |
| Storage | Supabase Storage | Disk storage via `/storage/v1` shim |
| RLS | Postgres policies | `lib/db/rest-guard.ts` + `/api/*` guards |
| Migrations | `supabase/migrations/` | **`db/migrations/001`–`004` (canonical)** |
| Connection | Supabase pooler | `lib/db/pool.ts` — one in-process Pool |

---

## Data layer architecture

```text
Browser / API routes
        │
        ├─ lib/supabase.ts ──► lib/db/http-client.ts ──► /rest/v1, /auth/v1, /storage/v1
        │
        └─ lib/supabase-admin.ts ──► lib/db/supabase-compat.ts ──► lib/db/pool.ts ──► PostgreSQL
```

### Key files

| File | Role |
|------|------|
| `lib/db/pool.ts` | Singleton `pg.Pool`; PostgREST-faithful type parsers |
| `lib/db/supabase-compat.ts` | `.from()`, `.rpc()`, filters, embeds — SQL builder over pool |
| `lib/db/http-client.ts` | Browser-facing fetch client mimicking supabase-js URL shape |
| `lib/supabase-admin.ts` | Server-side admin compat (bypasses REST guard where appropriate) |
| `lib/db/rest-guard.ts` | Table/RPC allowlists replacing RLS on `/rest/v1` |
| `lib/db/auth.ts` | JWT verify/issue |

**Dependencies:** `pg`, `jose`, `bcryptjs` — no `@supabase/*` in `package.json`.

---

## Schema migration path

1. **`001_plain_postgres.sql`** — Baseline DDL exported/adapted from Supabase schema; RLS removed; RPCs retained
2. **`002_uuid_id_defaults.sql`** — UUID insert defaults (`gen_random_uuid()`)
3. **`003_product_variants_sort_order.sql`** — Variant display order
4. **`004_payment_integrity_and_audit.sql`** — Payment audit tables, confirmation dedup, constraints

Legacy `supabase/migrations/20260209000000_complete_schema.sql` is **not** applied to production.

---

## Auth model

- Users live in **`auth.users`** (email + bcrypt password)
- **`public.profiles`** holds `role` (`admin`, etc.)
- JWT access tokens validated with `AUTH_JWT_SECRET` / `JWT_SECRET`
- Admin routes use `lib/admin-auth.ts` → `requireAdmin`
- Customer routes use `lib/auth.ts` → `verifyAuth`

RLS policies from Supabase are **not** replicated in Postgres. Equivalent rules:

- Public catalog reads via REST allowlist
- Sensitive tables (`orders`, `payment_*`, `audit_logs`, …) blocked on REST for non-admin
- Order tracking via RPC `get_order_for_tracking` (email + order number)

---

## Environment mapping

| Supabase-era concept | Plain Postgres replacement |
|---------------------|----------------------------|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` = app origin |
| `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (non-empty; server validates JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | Not used — server uses `DATABASE_URL` directly |
| `DATABASE_URL` (pooler) | `DATABASE_URL` → `store_palace` |
| Storage bucket | `STORAGE_ROOT` + `STORAGE_PUBLIC_URL` |

Full cutover checklist: [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md)

**Failure mode:** `DATABASE_URL` set but `NEXT_PUBLIC_USE_PLAIN_PG` unset → server on Postgres, client/middleware still expecting hosted Supabase → auth lockouts.

---

## Post-cutover audit findings (database)

Documented in [`DATABASE_AUDIT_AND_REPAIR_REPORT.md`](DATABASE_AUDIT_AND_REPAIR_REPORT.md):

- 45 tables at baseline; healthy FK and uniqueness integrity
- Missing columns/tables that code already referenced → fixed in **004**
- 2 empty product names, 1 empty slug → quarantined (not deleted)
- Zero orphan FKs; zero duplicate slugs or order numbers

---

## Verification commands

```bash
# No Supabase imports in runtime (manual grep)
rg '@supabase/' app lib --glob '!**/node_modules/**'

# Schema
npm run test:schema

# Health
curl -s https://thepricelesspalace.com/api/health/db

# REST shim (public catalog)
curl -s "$BASE/rest/v1/products?select=name&limit=3" \
  -H "apikey: x" -H "Authorization: Bearer x"
```

---

## Deployment context

| Item | Value |
|------|-------|
| Fleet DB slug | `store_palace` |
| Coolify app | `palace-app` |
| Domain | `https://thepricelesspalace.com` |
| Uploads | `/var/www/palace/uploads` |
| Git branch | `staging/plain-postgres` |

---

## Related documents

- [`MIGRATION_STATUS_REPORT.md`](MIGRATION_STATUS_REPORT.md)
- [`DATABASE_SCHEMA_REFERENCE.md`](DATABASE_SCHEMA_REFERENCE.md)
- [`PAYMENT_DATABASE_AUDIT.md`](PAYMENT_DATABASE_AUDIT.md)
- [`docs/STORE_HARDENING_PLAYBOOK.md`](docs/STORE_HARDENING_PLAYBOOK.md)
