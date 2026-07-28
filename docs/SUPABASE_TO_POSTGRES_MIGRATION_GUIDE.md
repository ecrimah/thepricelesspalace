# Palace — Supabase → plain Postgres cutover

**Shape:** A (latest) — no `@supabase/*`; HTTP client + `/rest/v1`, `/auth/v1`, `/storage/v1` shims + `DATABASE_URL`  
**Repo folder:** `palace`  
**Branch:** `staging/plain-postgres`  
**Fleet DB slug:** `store_palace` (provisioned)  
**Coolify app:** `palace-app` (`vbw578yuxwwbq9cenmyiwgxd`)  
**GitHub:** `https://github.com/ecrimah/thepricelesspalace.git` branch `staging/plain-postgres`  
**Domain:** `https://thepricelesspalace.com` (+ www + `palace.169-58-8-203.sslip.io`)  
**Uploads:** `/var/www/palace/uploads`  
**Admin:** `admin@palace.com` (bootstrap via seed / `npm run create-admin`)

See also: [`STORE_HARDENING_PLAYBOOK.md`](./STORE_HARDENING_PLAYBOOK.md) (copied from big-vps, Jul 2026).

## Env cutover trio (set together)

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Fleet/local Postgres URL for `store_palace` |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | **App origin** (e.g. `https://example.com` or `http://localhost:3001`), not `*.supabase.co` |

Also required:

- `AUTH_JWT_SECRET` / `JWT_SECRET` (must match tokens the auth shim issues)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (any non-empty client key the browser sends; server validates JWT)
- `NEXT_PUBLIC_APP_URL`
- `STORAGE_ROOT` / `STORAGE_PUBLIC_URL` (disk storage for `/storage/v1/...`)
- Optional: `RESEND_API_KEY`, payments (`HUBTEL_*`, `MOOLRE_*`, `PAYSTACK_*`)

**Failure mode:** `DATABASE_URL` set but `NEXT_PUBLIC_USE_PLAIN_PG` unset → server on PG, middleware still expecting hosted Supabase → admin lockouts.

## Schema

1. Apply [`db/migrations/001_plain_postgres.sql`](../db/migrations/001_plain_postgres.sql) (public.users, no RLS, RPCs kept).
2. Apply [`db/migrations/002_uuid_id_defaults.sql`](../db/migrations/002_uuid_id_defaults.sql) (playbook §1a).
3. Bootstrap admin: set `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `DATABASE_URL` then `npm run create-admin`.

## Verify after deploy

```bash
BASE=https://thepricelesspalace.com
git rev-parse --short HEAD

curl -s -o /dev/null -w "%{http_code}\n" "$BASE/"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/shop"
curl -s "$BASE/api/payment/moolre/callback"   # expect ready JSON
curl -s "$BASE/rest/v1/products?select=name&limit=3" \
  -H "apikey: x" -H "Authorization: Bearer x"
```

### Production verification (2026-07-28)

| Check | Result |
|-------|--------|
| `https://thepricelesspalace.com/` | 200 |
| `/shop`, `/admin/login` | 200 |
| DB `store_palace` | schema + 8 seeded products + admin |
| Admin login `admin@palace.com` | OK (`/auth/v1` + `/api/admin/me`) |
| Moolre callback GET | ready |
| Moolre callback POST without `?s=` | 401 (secret enforced) |
| Product images `/products/*.png` | 200 |

Payment callback URL (app builds this from `NEXT_PUBLIC_APP_URL`):  
`https://thepricelesspalace.com/api/payment/moolre/callback?s=<MOOLRE_CALLBACK_SECRET>`

## Notes

- Runtime has **zero** `@supabase/*` imports.
- Browser uses `lib/db/http-client.ts` via `lib/supabase.ts`.
- Server uses `lib/db/supabase-compat.ts` via `lib/supabase-admin.ts` when `DATABASE_URL` is set.
- Storage serves from disk under `STORAGE_ROOT` via `/storage/v1/object/...`.
- After every dump/restore: UUID `id` defaults (§1a in hardening playbook).
- Coolify env secrets live in Coolify UI / `/data/fleet/secrets/palace-app.env` — not in git.
