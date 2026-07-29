# Payment and Callback Audit

## Status matrix

| Gateway | Init | Callback auth | Verify | Amount check | Idempotent paid | Storefront UI |
|---------|------|---------------|--------|--------------|-----------------|---------------|
| Moolre | OK | Optional `?s=` + status API | OK | OK | OK | OK |
| Hubtel | OK | Status re-query (no signature) | OK | OK | OK | OK (default) |
| Paystack | OK | HMAC-SHA512 | OK | OK | OK | OK (wired) |

## Confirmation notifications

- `sendOrderConfirmation` claims `orders.confirmation_sent_at` once
- Prevents double SMS/email when callback + verify race

## Admin mark-paid

- Calls `mark_order_paid` (stock + status) then confirmation (deduped)

## SMS (Moolre)

- `lib/notifications.ts` → `sendSMS` with 15s timeout, phone masking
- Env: `MOOLRE_SMS_API_KEY` (fallback `MOOLRE_API_KEY`), `SMS_SENDER_ID`

## Callback routes

| Route | Method | Notes |
|-------|--------|-------|
| `/api/payment/moolre/callback` | POST | Secret query param when configured |
| `/api/payment/hubtel/callback` | POST | Re-verifies via RMSC |
| `/api/payment/paystack/callback` | POST | Signature required |

## Test status

- Unit/policy tests: `npm run test:audit` pass
- Live sandbox charges/SMS: **not executed** in this pass (requires explicit credentials authorization)
