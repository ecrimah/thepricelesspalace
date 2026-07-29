# Supabase → Postgres Migration Report

**Project:** The Priceless Palace  
**Shape:** A — zero `@supabase/*` runtime packages; HTTP + server compat shims

## Feature matrix

| Supabase feature | Replacement | Status |
|------------------|-------------|---------|
| Postgres database | Plain Postgres `store_palace` via fleet | Done |
| PostgREST | `/rest/v1` + `supabase-compat.ts` | Done + hardened |
| GoTrue Auth | `/auth/v1` + `lib/db/auth.ts` JWT | Done |
| Storage | Local disk `STORAGE_ROOT` + `/storage/v1` | Done |
| RLS | App-layer allowlists + `/api/*` guards | Hardened this pass |
| RPC | Postgres functions + `/rest/v1/rpc` | Done |
| Realtime | Not used / not replaced | N/A |
| Edge functions | Next.js API routes | Done |
| Service role key | `supabaseAdmin` pool (server-only) | Done |

## Remaining Supabase references

- Naming only: `supabase`, `supabaseAdmin`, env aliases `NEXT_PUBLIC_SUPABASE_URL` (app origin), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (any non-empty), `SUPABASE_JWT_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` (legacy gate checks)
- No hosted Supabase project required

## Schema

- Source: `db/migrations/001_plain_postgres.sql`, `002_uuid_id_defaults.sql`
- Auth schema: `auth.users` preserved for GoTrue-compat

## Storage

- Disk path (prod): `/var/www/palace/uploads` (or `STORAGE_ROOT`)
- Public URLs: `/storage/v1/object/public/...` and `/products/*.webp` static assets
