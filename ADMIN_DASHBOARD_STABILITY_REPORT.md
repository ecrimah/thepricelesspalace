# Admin Dashboard Stability Report

## Sections

| Section | Source | Timeout | Error/Retry | Notes |
|---------|--------|---------|-------------|-------|
| KPI cards | `/api/admin/dashboard` | 20s client | Yes | SQL aggregates |
| Revenue chart (7d) | same API | 20s | Yes | Grouped SQL |
| Recent orders | same API | 20s | Yes | LIMIT 5 |
| Low stock | same API | 20s | Yes | LIMIT 5 |
| Products strip | same API | 20s | Yes | LIMIT 4 |
| Shell / sidebar | `admin/layout` | 12s `/me` | Redirects login | Auth once per session |

## Failure isolation

Dashboard now fails as a page with Retry (not infinite spinner). Gateways are **not** contacted on load.

## Pagination

- Dashboard lists are limited server-side.
- Support tickets/conversations already paginated.
- Orders admin list: still loads via `/api/admin/orders` — recommend page size when volume grows.
