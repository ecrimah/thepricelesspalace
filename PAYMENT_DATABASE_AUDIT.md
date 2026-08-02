# Payment Database Audit — Palace

**Database:** `store_palace` (PostgreSQL 16.14)  
**Gateways in scope:** Moolre (primary), Hubtel, Paystack, manual/POS  
**Migration:** `db/migrations/004_payment_integrity_and_audit.sql`  
**Application audit module:** `lib/payment-audit.ts`

---

## Executive summary

Before migration 004, payment state lived only on `orders` (`payment_status`, `payment_transaction_id`, etc.) with **no attempt-level or webhook-level audit trail**. Application code already attempted to write `confirmation_sent_at` and payment audit rows, but the database objects did not exist. Migration 004 adds three audit tables and aligns the schema with hardened Moolre callback handling, idempotent webhooks, and SMS logging.

---

## Pre-004 payment schema

### Existing (001)

**`public.orders`** — payment-related columns:

| Column | Purpose |
|--------|---------|
| `payment_status` | Enum: pending, paid, failed, … |
| `payment_method` | e.g. mobile money |
| `payment_provider` | Gateway name |
| `payment_transaction_id` | External reference |
| `payment_reminder_sent` | Cron dedup flag |
| `payment_reminder_sent_at` | Reminder timestamp |
| `total`, `currency` | Amount context |

**Missing before 004:**

- `confirmation_sent_at` — code wrote it; column absent
- `payment_attempts` — no per-attempt lifecycle
- `payment_webhook_events` — no callback deduplication store
- `sms_messages` — no SMS audit trail

### Data baseline

- 5 orders in live DB at audit time
- No duplicate `order_number` values
- No orphan payment-related FKs (payment tables did not yet exist)

---

## Post-004 payment schema

### `orders.confirmation_sent_at`

- Type: `timestamptz`, nullable
- Index: `idx_orders_confirmation_sent_at` partial `WHERE confirmation_sent_at IS NULL` — efficient “unsent confirmations” queries
- Used to deduplicate post-payment confirmation SMS/email

### `payment_attempts`

Gateway-agnostic attempt log.

| Field | Notes |
|-------|-------|
| `internal_reference` | Unique — app-generated primary key for idempotency |
| `gateway_reference` | Provider's transaction ID |
| `expected_amount` / `amount_paid` | Reconciliation |
| `status` | `pending` → `processing` → `successful` / `failed` / … |
| `idempotency_key` | Unique partial index when not null |
| `metadata` | JSONB — no PANs or secrets |

**FK:** `order_id` → `orders(id)` ON DELETE CASCADE

**Indexes:** order_id, (gateway, gateway_reference), (status, created_at DESC)

### `payment_webhook_events`

Inbound callback audit and deduplication.

| Field | Notes |
|-------|-------|
| `external_event_id` | Provider event ID |
| `payload_hash` | SHA-256 of payload for duplicate detection |
| `signature_valid` | Whether callback secret/signature passed |
| `processing_status` | received → processed / ignored / failed |
| `order_id`, `payment_attempt_id` | Optional links |

**Unique indexes:**

- `(gateway, external_event_id)` where external_event_id IS NOT NULL
- `(gateway, payload_hash)` where payload_hash IS NOT NULL

### `sms_messages`

Outbound SMS audit (Moolre SMS).

| Field | Notes |
|-------|-------|
| `recipient_masked` | Last 4 digits visible |
| `recipient_hash` | SHA-256 of normalized phone — not reversible |
| `idempotency_key` | Unique — prevents duplicate sends |
| `message_type`, `template_key` | Classification |
| `related_order_id`, `related_payment_attempt_id` | Correlation |

---

## Application integration

### `lib/payment-audit.ts`

| Function | Purpose |
|----------|---------|
| `recordPaymentAttempt()` | Upsert on `internal_reference` at checkout/init |
| `finalizePaymentAttempt()` | Set terminal status after gateway verification |
| `recordWebhookEvent()` | Insert webhook with payload hash; skip duplicates |
| `recordSmsMessage()` | Queue/send audit with idempotency |

Never stores full phone numbers in clear text in audit metadata; uses hash/mask helpers.

### Moolre routes

| Route | Behavior |
|-------|----------|
| `POST /api/payment/moolre` | Requires `MOOLRE_CALLBACK_SECRET` to build callback URL; records attempt |
| `GET/POST /api/payment/moolre/callback` | Validates `?s=MOOLRE_CALLBACK_SECRET`; records webhook event; finalizes attempt; updates order |

Without `MOOLRE_CALLBACK_SECRET`, init and callback fail closed (logged error, 401/500 as appropriate).

### Storefront pay loader

`GET /api/storefront/pay/[orderId]`:

- Loads order + items for checkout UI
- Stock check uses **`products.quantity`** (and variant quantity) — not a nonexistent `stock` column
- If `payment_status === 'paid'`, returns minimal redacted payload (`alreadyPaid: true`)

### Coupon redeem

`POST /api/storefront/coupons/redeem`:

- Requires `orderNumber` + `code`
- Validates order exists, within 1-hour window, coupon matches `order.metadata`

### Cron

`GET /api/cron/payment-reminders`:

- Requires `Authorization: Bearer <CRON_SECRET>`
- Queries unpaid orders with `payment_reminder_sent = false`

---

## Access control

### REST shim (`lib/db/rest-guard.ts`)

Non-admin **cannot read or mutate** via `/rest/v1`:

- `payment_attempts`
- `payment_webhook_events`
- `sms_messages`
- `audit_logs`

Admin and server-side `/api/*` routes use `supabaseAdmin` with direct pool access.

### Order lookup (PII)

Public order access requires email proof:

- RPC `get_order_for_tracking(order_number, email)`
- `GET /api/storefront/orders/[orderNumber]?email=...`

---

## Check constraints (004)

Added with `NOT VALID` then `VALIDATE` to avoid long locks:

| Constraint | Rule |
|------------|------|
| `orders_total_nonneg` | `orders.total >= 0` |
| `order_items_qty_positive` | `order_items.quantity > 0` |
| `order_items_unit_price_nonneg` | `order_items.unit_price >= 0` |
| `products_price_nonneg` | `products.price >= 0` |

---

## Verification

```bash
npm run test:schema
curl -s "$BASE/api/health/db"
```

Health checks include all three payment audit tables and `orders.confirmation_sent_at`.

Post-deploy Moolre smoke:

- Callback GET returns ready JSON
- Callback POST without `?s=` → 401

---

## Rollback (004 payment objects only)

```sql
DROP TABLE IF EXISTS public.sms_messages;
DROP TABLE IF EXISTS public.payment_webhook_events;
DROP TABLE IF EXISTS public.payment_attempts;
DROP INDEX IF EXISTS public.idx_orders_confirmation_sent_at;
ALTER TABLE public.orders DROP COLUMN IF EXISTS confirmation_sent_at;
```

**Data loss:** All attempt, webhook, and SMS audit history. Reconcile any in-flight payments manually before rollback.

---

## Related documents

- [`DATABASE_AUDIT_AND_REPAIR_REPORT.md`](DATABASE_AUDIT_AND_REPAIR_REPORT.md)
- [`DATABASE_SCHEMA_REFERENCE.md`](DATABASE_SCHEMA_REFERENCE.md) — payment table columns
- [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md) — `MOOLRE_*` env names
