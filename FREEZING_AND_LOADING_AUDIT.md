# Freezing and Loading Audit

## Architecture (actual)

- Next.js 15 App Router, React 19, TypeScript
- Plain Postgres via singleton `pg` Pool (`lib/db/pool.ts`)
- Supabase-compat shims (`/rest/v1`, `/auth/v1`, `/storage/v1`) — no `@supabase/*`
- Admin: client layout gate + JWT middleware + `/api/admin/*`
- Payments: Moolre / Hubtel / Paystack API routes (not called on dashboard mount)
- SMS: Moolre via `lib/notifications.ts` (15s abort)

## Root causes confirmed

1. **Unbounded admin dashboard query** — full `orders` select in browser.
2. **Middleware hang** — maintenance REST fetch without timeout.
3. **Client HTTP hang** — http-client fetches without AbortSignal.
4. **Pool slot exhaustion risk** — no statement/query/lock timeouts.
5. **Admin auth re-fetch loop** — layout depended on `pathname` and revalidated every navigation.
6. **Loading flags without `finally`** — roles, support pages, delivery poll stacking.
7. **Customer insights full-table pulls** — profiles + orders unbounded.

## Fixes applied

| Area | Fix |
|------|-----|
| Dashboard | `GET /api/admin/dashboard` SQL aggregates; UI retry/error |
| Pool | `query_timeout`, `statement_timeout`, `lock_timeout`, idle-in-tx timeout |
| Middleware | `AbortSignal.timeout(3000)` on maintenance check |
| HTTP client | `fetchWithTimeout` 15s (uploads 60s) |
| Admin layout | Auth once per session; 12s timeout on `/api/admin/me` |
| Admin pages | try/finally loading cleanup (roles, support*, customers, delivery) |
| Indexes | migration `005_dashboard_query_indexes.sql` applied on live DB |
| Insights | row caps (profiles 2000, orders 5000) |

## Remaining risks (manual / follow-up)

- Admin orders list API may still return large payloads as catalog grows — add server pagination.
- Analytics still pulls date-range orders client-side (OK at current size; move to SQL aggregates later).
- POS page has unrelated local edits — left untouched.
- Deploy required for code fixes to reach production container.

## Status

Code repairs complete in staging branch working tree. Deploy + hard-refresh required for live verification.
