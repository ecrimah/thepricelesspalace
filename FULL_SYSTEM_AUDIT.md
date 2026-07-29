# Full System Audit — The Priceless Palace

**Branch:** `staging/plain-postgres`  
**Audit date:** 2026-07-29  
**Stack:** Next.js 15 + node-postgres (`pg`) + Supabase-compat shims (Shape A)

---

## 1. Baseline (before repairs)

| Check | Result |
|-------|--------|
| Git | `staging/plain-postgres` @ `247e4d4` |
| Node / npm | v24.14.0 / 11.9.0 |
| Live home / shop / products API | HTTP 200 |
| `@supabase/*` packages | 0 |
| Pages | 68 |
| API routes | 51 + 6 auth/rest/storage shims |

### Critical findings at baseline

1. Open `/rest/v1` (no JWT / no table allowlists)
2. Client-trusted checkout totals
3. Confirmation SMS/email could double-send
4. Admin mark-paid skipped `mark_order_paid` RPC
5. Paystack API-only (no storefront UI)
6. Password recover + phone verify were dishonest stubs

---

## 2. Architecture summary

Browser → `lib/supabase.ts` → `/rest/v1|/auth/v1|/storage/v1` → `lib/db/supabase-compat.ts` → `pg` Pool → `store_palace`.  
Server APIs → `lib/supabase-admin.ts` → same compat layer.

RLS replacement: [`lib/db/rest-guard.ts`](lib/db/rest-guard.ts) + `/api/*` authorization.

---

## 3. Page inventory (smoke 2026-07-29)

| Route | Status |
|-------|--------|
| `/`, `/shop`, `/about`, `/contact`, `/categories` | Working |
| `/cart`, `/checkout`, `/wishlist`, `/product/[slug]` | Working |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password` | Working (forgot-password honest error) |
| `/account/verify-phone` | Working (explicitly unavailable) |
| `/order-tracking`, `/order-success`, `/pay/[orderId]` | Working |
| `/faqs`, `/help`, `/privacy`, `/terms`, `/shipping`, `/returns` | Working |
| `/admin/login` | Working |
| `/blog`, `/blog/[id]` | Manual review (placeholder content) |
| Admin dashboard pages | Manual review after deploy (auth required) |

---

## 4. Auth architecture

- JWT + bcrypt on `auth.users` (`lib/db/auth.ts`)
- Middleware protects `/admin/*`
- `/rest/v1` mutations require role allowlists
- Password email recovery: not implemented (clear 501 / UI message)
- Phone OTP: not implemented (honest UI)

---

## 5. Payment / SMS

See `PAYMENT_AND_CALLBACK_AUDIT.md`.

---

## 6. Performance

See `PERFORMANCE_REPORT.md`.

---

## 7. Security findings repaired

| Finding | Fix |
|---------|-----|
| Open REST CRUD | JWT + allowlists; orders writes blocked for non-admin |
| Client order totals | Server-priced `/api/storefront/checkout` |
| Duplicate confirmations | `confirmation_sent_at` claim |
| mark-paid incomplete | Uses `mark_order_paid` + notifications |
| Notifications used browser supabase | Switched to `supabaseAdmin` |

### Remaining risks

- Authenticated non-admin GET on non-public tables via REST can still read rows if IDs are guessed (IDOR residual). Prefer storefront APIs for new work.
- Live payment/SMS not re-tested with sandbox charges in this pass.
- Blog / reorder / bulk-restock remain stubs.

---

## 8. Testing

| Check | Result |
|-------|--------|
| `npm run test:audit` | Pass |
| `tsc --noEmit` | Pass |
| `npm run build` | Pass |
| Live public smoke (26 routes) | All HTTP 200 |

---

## 9. Fixes applied

See `REPAIR_CHANGELOG.md`.
