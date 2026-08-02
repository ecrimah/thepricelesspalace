# Database Schema Reference — Palace

**Database:** `store_palace` (PostgreSQL 16.14, `fleet-postgres` on big VPS)  
**Full DDL:** [`db/migrations/001_plain_postgres.sql`](db/migrations/001_plain_postgres.sql) + incremental `002`–`004`  
**Legacy DDL (do not apply):** `supabase/migrations/`

This document summarizes core tables. For complete column lists, indexes, enums, and RPC definitions, use the migration files.

---

## Schema layout

| Schema | Purpose |
|--------|---------|
| `auth` | `users` — credentials and identity (JWT subject) |
| `public` | Store catalog, orders, CMS, support, delivery |

**Pre-004:** 45 tables (`auth.users` + 44 public)  
**Post-004:** 48 tables (`auth.users` + 47 public — adds 3 payment/SMS audit tables)

---

## Auth and access

### `auth.users`

Identity store. Columns include `email`, `encrypted_password`, `email_confirmed_at`, metadata. Indexed on `lower(email)`.

### `public.profiles`

Extends `auth.users` with `role` (e.g. `admin`, `customer`), display fields, phone. FK → `auth.users(id)`.

### `public.roles`

Role definitions and permissions metadata (legacy/auxiliary; primary gate is `profiles.role`).

**Authorization:** No Postgres RLS. Access enforced in `lib/db/rest-guard.ts` (REST shim) and `/api/*` route guards.

---

## Catalog

### `public.categories`

Hierarchy via `parent_id`. Slug, status, SEO fields.

### `public.products`

Core merchandise: `name`, `slug` (unique), `price`, `quantity`, `status` (`active`/`draft`/…), `category_id`, options JSON, metadata.  
Post-004: `products_price_nonneg` check constraint.

### `public.product_images`

Images per product; `position` for ordering.

### `public.product_variants`

SKU-level variants: `price`, `quantity`, option fields, `sort_order` (migration `003` / index `idx_product_variants_sort_order`).

---

## Commerce

### `public.orders`

| Column | Notes |
|--------|-------|
| `order_number` | Unique, customer-facing |
| `email`, `phone` | Contact |
| `status` | `order_status` enum |
| `payment_status` | `payment_status` enum |
| `subtotal`, `tax_total`, `shipping_total`, `discount_total`, `total` | Financial |
| `shipping_address`, `billing_address` | JSONB |
| `payment_method`, `payment_provider`, `payment_transaction_id` | Gateway refs |
| `payment_reminder_sent`, `payment_reminder_sent_at` | Cron reminders |
| `confirmation_sent_at` | **004** — dedup confirmation SMS/email |

### `public.order_items`

Line items: `product_id`, `variant_id`, `quantity`, `unit_price`, `total_price`, denormalized names.  
Post-004: quantity > 0, unit_price ≥ 0 checks.

### `public.order_status_history`

Audit trail of status transitions.

### `public.coupons`

Discount codes: `code` (unique), usage limits, validity window, `is_active`.

### `public.cart_items` / `public.wishlist_items`

Per-user session persistence (FK → `auth.users`).

---

## Payment audit (004)

### `public.payment_attempts`

One row per payment initiation. Key fields:

- `gateway` — `moolre`, `hubtel`, `paystack`, `manual`, `pos`, `other`
- `internal_reference` — unique (app-generated)
- `gateway_reference`, `expected_amount`, `amount_paid`, `status`, `idempotency_key`
- FK → `orders(id)` ON DELETE CASCADE

### `public.payment_webhook_events`

Inbound callback log. Dedup indexes on `(gateway, external_event_id)` and `(gateway, payload_hash)`. Links to `orders` and `payment_attempts`.

### `public.sms_messages`

Outbound SMS audit. Stores `recipient_masked`, `recipient_hash` (not full phone), `idempotency_key` (unique), `message_type`, status lifecycle.

**Application helpers:** [`lib/payment-audit.ts`](lib/payment-audit.ts)

---

## Customers and reviews

### `public.customers`

CRM-style customer records (may link to orders/users).

### `public.reviews` / `public.review_images`

Product reviews and attachments.

### `public.return_requests` / `public.return_items`

Returns workflow.

---

## CMS and storefront content

### `public.store_settings` / `public.site_settings`

Key-value store configuration.

### `public.pages`, `public.cms_content`, `public.banners`

Static and dynamic content blocks.

### `public.blog_posts`

Blog with slug, status, author FK.

### `public.navigation_menus` / `public.navigation_items`

Header/footer navigation trees.

### `public.store_modules`

Feature flags / module toggles.

---

## Support

| Table | Purpose |
|-------|---------|
| `support_tickets` | Ticket header |
| `support_ticket_messages` | Thread messages |
| `support_feedback` | CSAT / feedback (public POST allowed) |
| `support_knowledge_base` | KB articles |
| `support_canned_responses` | Agent snippets |
| `support_escalation_rules` | Routing rules |
| `support_analytics_daily` | Aggregated metrics |

### `public.chat_conversations` / `public.ai_memory` / `public.customer_insights`

AI chat and analytics adjunct tables.

---

## Delivery

| Table | Purpose |
|-------|---------|
| `delivery_zones` | Geographic zones |
| `riders` | Delivery personnel |
| `delivery_assignments` | Order ↔ rider |
| `delivery_status_history` | Status audit |

---

## Misc

| Table | Purpose |
|-------|---------|
| `addresses` | Saved user addresses |
| `notifications` | In-app notifications |
| `audit_logs` | Staff action audit (REST read: admin only) |
| `contact_submissions` | Public contact form |

---

## Key RPCs (defined in 001)

| Function | Access | Purpose |
|----------|--------|---------|
| `get_order_for_tracking(p_order_number, p_email)` | Public (REST guard) | Order lookup with email proof |
| `upsert_customer_from_order` | Authenticated | Sync customer from order |

---

## Indexes (high level)

- **001** defines btree indexes on FK columns, slugs, status fields, and common filters (products, orders, order_items, etc.)
- **003** adds `idx_product_variants_sort_order (product_id, sort_order)`
- **004** adds payment/SMS indexes and partial index on `orders.confirmation_sent_at WHERE confirmation_sent_at IS NULL`

See [`DATABASE_PERFORMANCE_REPORT.md`](DATABASE_PERFORMANCE_REPORT.md) for index rationale.

---

## Enums (selected)

- `order_status`, `payment_status`, `product_status` — defined in `001_plain_postgres.sql`

---

## Where to look next

| Need | File |
|------|------|
| Complete CREATE TABLE statements | `db/migrations/001_plain_postgres.sql` |
| UUID defaults on insert | `db/migrations/002_uuid_id_defaults.sql` |
| Variant sort order | `db/migrations/003_product_variants_sort_order.sql` |
| Payment/SMS/confirmation | `db/migrations/004_payment_integrity_and_audit.sql` |
| REST table allowlists | `lib/db/rest-guard.ts` |
