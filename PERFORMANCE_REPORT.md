# Performance Report

## Baseline problems

- Hero/product WebP 404 after deploy mismatch (fixed earlier; verified 200)
- Next image optimizer delay on already-optimized WebP (LazyImage unoptimized for static)
- Open REST allowed unbounded client scans
- Admin orders list unbounded

## Fixes this pass

| Area | Change |
|------|--------|
| REST | Allowlists reduce anonymous heavy access |
| Checkout | Single server API vs many client round-trips |
| Admin orders | `.limit(200)` (max 500) |
| Pool | `connectionTimeoutMillis: 10000` |
| Gateways / SMS | 15–20s AbortSignal timeouts |
| SW | Cache bump `sw-v2.13-audit-repair` |

## Measurements (live, 2026-07-29)

| Path | HTTP | Notes |
|------|------|-------|
| `/` | 200 | |
| `/shop` | 200 | |
| `/products/product-blue-midi-dress.webp` | 200 | ~19KB |
| `/hero-home-1.webp` | 200 | ~220KB |
| `/api/storefront/products?limit=1` | 200 | |

## Recommendations

- Prefer `/api/storefront/*` for new storefront features
- Add cursor pagination to admin orders when volume grows
- Monitor Coolify concurrency vs `PG_POOL_MAX`
