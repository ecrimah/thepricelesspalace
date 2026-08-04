# External Service Timeout Report

| Service | Timeout | Retries | Blocks UI? | Idempotency |
|---------|---------|---------|------------|-------------|
| Moolre payment | 20s (`lib/moolre.ts`) | Controlled in route | Only on pay/checkout flows | `payment_attempts` + webhook events |
| Hubtel payment | 20s (`lib/hubtel.ts`) | Controlled in route | Pay flows only | Same audit tables |
| Paystack | Route-level fetch | Controlled | Pay flows only | Same |
| Moolre SMS | 15s AbortController (`lib/notifications.ts`) | Limited | Notifications/test-sms only — **not** dashboard | `sms_messages` + idempotency keys |
| REST/auth client | 15s | None on 4xx | Admin/store data | N/A |
| Middleware maintenance | 3s | None (fail open) | Storefront nav | Cached 15s |
| Admin `/me` | 12s | None | Admin shell | N/A |
| Dashboard API | 20s client / 15s SQL | Manual Retry | Dashboard only | N/A |

## Rules

- Dashboard must never call payment providers on mount (verified).
- Callbacks should ack quickly; SMS/email should not block webhook response (existing audit helpers).
