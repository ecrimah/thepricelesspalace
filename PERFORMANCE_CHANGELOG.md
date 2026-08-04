# Performance Changelog

## Files changed (this audit)

- `lib/db/pool.ts` — timeouts, pool stats, error handler
- `lib/fetch-with-timeout.ts` — new
- `lib/db/http-client.ts` — all fetches timed
- `middleware.ts` — maintenance fetch timeout
- `app/admin/layout.tsx` — auth once + timeout
- `app/admin/page.tsx` — dashboard API consumer + error/retry
- `app/api/admin/dashboard/route.ts` — new aggregate API
- `app/api/health/db/route.ts` — pingMs + pool
- `app/admin/roles/page.tsx` — finally
- `app/admin/support/**` — finally / timeout poll
- `app/admin/customers/page.tsx` — loading cleanup
- `app/admin/delivery/page.tsx` — abort/stale guards
- `app/admin/customer-insights/page.tsx` — row caps
- `db/migrations/005_dashboard_query_indexes.sql` — indexes

## Measurements

| Item | Before | After |
|------|--------|-------|
| Dashboard data path | Full orders download in browser | SQL aggregates via API |
| HTTP client | No timeout | 15s (60s uploads) |
| Middleware maintenance | Infinite wait possible | 3s |
| Pool hung query | Could pin forever | 15s statement/query timeout |
| KPI aggregate (6 orders) | N/A client-side | ~0.1ms SQL |
