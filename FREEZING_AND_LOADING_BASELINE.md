# Freezing & Loading Baseline

Captured: 2026-08-04 (staging / live Coolify `palace-app`, DB `store_palace`)

## Environment

| Item | Value |
|------|--------|
| App | Next.js 15.5 App Router |
| DB | Plain Postgres 16 via `pg` pool |
| Host | big-vps Coolify |
| Orders | 6 |
| Products | 75 |
| Active DB connections (spot) | 1 |

## Pre-fix symptoms (confirmed in code)

1. Admin dashboard loaded **entire `orders` table** into the browser for KPIs.
2. Middleware maintenance check `fetch` had **no timeout** (could stall every storefront navigation).
3. HTTP client (`lib/db/http-client.ts`) had **no AbortSignal** on REST/auth fetches.
4. Pool had **no statement/query/lock timeout**.
5. Admin layout re-ran `/api/admin/me` on **every pathname change**.
6. Several admin pages cleared loading only on success (roles, support hub, tickets, etc.).

## Live health (before deploy of this audit)

`GET /api/health/db` → `healthy`, all required tables present.

## Aggregate query timing (after indexes)

```
EXPLAIN ANALYZE COUNT/SUM paid orders → Execution Time ~0.1 ms (6 rows)
```

## Targets after repair

| Metric | Target |
|--------|--------|
| Admin shell after auth | < 2s typical |
| Dashboard KPI API | < 1s with current data; timeout 20s |
| REST/auth client fetch | abort at 15s |
| Middleware maintenance | abort at 3s |
| PG statement_timeout | 15s |
| PG lock_timeout | 5s |
