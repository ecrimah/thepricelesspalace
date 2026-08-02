# Database Performance Report — Palace

**Database:** `store_palace` (PostgreSQL 16.14, `fleet-postgres`)  
**Connection model:** Single in-process pool — `lib/db/pool.ts` (`PG_POOL_MAX` default 10)  
**Workload profile:** Small catalog (~48 products), low order volume (~5 orders at audit), ecommerce + admin + support

---

## Summary

The schema is index-heavy on foreign keys and lookup columns from the initial `001` migration. Current data volumes are small; no query planner issues were reported at audit time. Migration 004 adds targeted indexes for payment audit, confirmation dedup, and webhook processing queues. No materialized views or read replicas are in use.

---

## Connection pooling

| Setting | Value | Location |
|---------|-------|----------|
| Pool implementation | `pg.Pool` singleton | `lib/db/pool.ts` |
| Max connections | `PG_POOL_MAX` env or **10** | `getPool()` |
| Idle timeout | 30s | `pool.ts` |
| App instances | Single Coolify container typical | One pool per Node process |

**Guidance:** On VPS with limited Postgres `max_connections`, keep `PG_POOL_MAX` modest (5–10) if multiple store apps share `fleet-postgres`.

---

## Index inventory (by domain)

### Catalog (001)

| Index | Table | Columns | Use case |
|-------|-------|---------|----------|
| `idx_products_slug` | products | slug | Product pages |
| `idx_products_status` | products | status | Shop filters |
| `idx_products_category` | products | category_id | Category listings |
| `idx_products_featured` | products | featured | Homepage |
| `idx_product_variants_product` | product_variants | product_id | Variant load |
| `idx_product_variants_sort_order` | product_variants | product_id, sort_order | Ordered variant display (003) |
| `idx_categories_slug` | categories | slug | Navigation |

### Orders (001)

| Index | Table | Columns | Use case |
|-------|-------|---------|----------|
| `idx_orders_number` | orders | order_number | Tracking, lookups |
| `idx_orders_email` | orders | email | `get_order_for_tracking` |
| `idx_orders_payment` | orders | payment_status | Admin filters, cron |
| `idx_orders_created` | orders | created_at | Sorting, reminders |
| `idx_order_items_order` | order_items | order_id | Line item fetch |

### Payment audit (004)

| Index | Table | Columns | Use case |
|-------|-------|---------|----------|
| `payment_attempts_internal_reference_key` | payment_attempts | internal_reference (UNIQUE) | Idempotent upsert |
| `idx_payment_attempts_idempotency` | payment_attempts | idempotency_key (partial) | Duplicate init prevention |
| `idx_payment_attempts_order` | payment_attempts | order_id | Order payment history |
| `idx_payment_attempts_gateway_ref` | payment_attempts | gateway, gateway_reference | Callback reconciliation |
| `idx_payment_attempts_status_created` | payment_attempts | status, created_at DESC | Admin dashboards |
| `idx_webhook_events_gateway_external` | payment_webhook_events | gateway, external_event_id | Webhook dedup |
| `idx_webhook_events_payload_hash` | payment_webhook_events | gateway, payload_hash | Hash dedup |
| `idx_webhook_events_unprocessed` | payment_webhook_events | processing_status, received_at (partial) | Retry queue |
| `idx_sms_messages_order` | sms_messages | related_order_id | Order SMS history |
| `idx_sms_messages_status` | sms_messages | status, created_at DESC | Failed SMS review |

### Confirmation dedup (004)

| Index | Table | Definition | Use case |
|-------|-------|------------|----------|
| `idx_orders_confirmation_sent_at` | orders | `(confirmation_sent_at) WHERE confirmation_sent_at IS NULL` | Find orders needing confirmation |

---

## Query patterns

### Hot paths (expected)

1. **Shop listing** — `products` filtered by `status`, joined to `categories`, `product_variants`
2. **Checkout / pay page** — single order by id or `order_number` + nested `order_items` + product quantity check
3. **Order tracking** — RPC `get_order_for_tracking` on `(order_number, email)` — uses unique order_number index
4. **Moolre callback** — insert webhook event, lookup attempt by `internal_reference` or gateway ref
5. **Payment reminder cron** — unpaid orders where `created_at < now()-15m` and `payment_reminder_sent = false` (limit 50)

### Compat layer overhead

`lib/db/supabase-compat.ts` builds SQL from chainable filters. Embedded relations (PostgREST-style) issue **additional queries** per relationship. Acceptable at current scale; watch N+1 patterns on admin product lists with many embeds.

---

## Constraints and validation strategy (004)

Financial checks added as:

```sql
ADD CONSTRAINT ... CHECK (...) NOT VALID;
ALTER TABLE ... VALIDATE CONSTRAINT ...;
```

This avoids full table rewrites on large tables. At Palace's row counts, validation is instantaneous.

---

## Missing / deferred optimizations

Not required at current scale; revisit if orders exceed ~10k or catalog exceeds ~1k SKUs:

| Item | Notes |
|------|-------|
| Partial index on unpaid orders | Cron query could use `(payment_status, payment_reminder_sent, created_at) WHERE payment_status != 'paid'` |
| `pg_stat_statements` | Enable on fleet-postgres for slow query tracking |
| Connection pooling proxy | PgBouncer if many app replicas |
| Read replica | Not provisioned |

---

## Monitoring

| Endpoint / tool | Purpose |
|-----------------|---------|
| `GET /api/health/db` | Connectivity + required tables/columns |
| `npm run test:schema` | CI/manual schema drift detection |
| Postgres logs | Via `fleet-postgres` container on VPS |
| Coolify deploy logs | App-level query errors |

Health endpoint intentionally exposes **no** hostnames, credentials, or row data.

---

## Backup performance note

Fleet stores backups under `/data/fleet/backups` on big VPS. Restore time for `store_palace` is proportional to dump size — currently small (see [`DATABASE_RECOVERY_GUIDE.md`](DATABASE_RECOVERY_GUIDE.md)).

---

## Related documents

- [`DATABASE_SCHEMA_REFERENCE.md`](DATABASE_SCHEMA_REFERENCE.md)
- [`DATABASE_AUDIT_AND_REPAIR_REPORT.md`](DATABASE_AUDIT_AND_REPAIR_REPORT.md)
- [`MIGRATION_STATUS_REPORT.md`](MIGRATION_STATUS_REPORT.md)
