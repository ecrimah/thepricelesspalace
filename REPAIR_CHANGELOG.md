# Repair Changelog — 2026-07-29

## Security

- Added [`lib/db/rest-guard.ts`](lib/db/rest-guard.ts)
- Hardened [`app/rest/v1/[table]/route.ts`](app/rest/v1/[table]/route.ts) and [`app/rest/v1/rpc/[fn]/route.ts`](app/rest/v1/rpc/[fn]/route.ts)
- Blocked non-admin REST writes to `orders`, `order_items`, `store_settings`, etc.
- Blocked browser invocation of `mark_order_paid` except admin/staff

## Checkout

- Rewrote [`app/api/storefront/checkout/route.ts`](app/api/storefront/checkout/route.ts) for server-side pricing
- [`app/(store)/checkout/page.tsx`](app/(store)/checkout/page.tsx) creates orders only via API

## Payments / SMS

- Confirmation dedup via `confirmation_sent_at` in [`lib/notifications.ts`](lib/notifications.ts)
- SMS fetch timeout (15s); payment gateway fetches timeout (20s)
- [`app/api/admin/orders/[id]/mark-paid/route.ts`](app/api/admin/orders/[id]/mark-paid/route.ts) uses `mark_order_paid`
- Paystack wired in checkout, pay page, order-success verify
- Notifications DB access uses `supabaseAdmin`

## Auth UX

- Forgot-password and `/auth/v1/recover` return honest “not available” messaging
- Verify-phone page no longer fakes success

## Performance

- Admin orders API capped at 200 (max 500)
- Pool `connectionTimeoutMillis: 10000`
- Service worker cache `sw-v2.13-audit-repair`

## Docs / tests

- `FULL_SYSTEM_AUDIT.md`, `SUPABASE_TO_POSTGRES_MIGRATION_REPORT.md`, `PAYMENT_AND_CALLBACK_AUDIT.md`, `PERFORMANCE_REPORT.md`
- `npm run test:audit` → `scripts/audit-unit-tests.mjs`
- `.env.example` updated (names only)

## Database migrations

- No new SQL migration required (`confirmation_sent_at` already present)
