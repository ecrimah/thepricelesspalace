# Website Stability Checklist (reusable)

- [ ] Every `setLoading(true)` has `finally { setLoading(false) }`
- [ ] Every browser/server `fetch` has timeout/AbortSignal
- [ ] Shared DB pool only (no per-request clients)
- [ ] `statement_timeout` + `lock_timeout` configured
- [ ] Admin dashboard uses SQL aggregates, not full table downloads
- [ ] Optional cards fail independently / Retry visible
- [ ] Lists are paginated or hard-capped
- [ ] Middleware does not block `/api`, `/rest`, `/auth`, callbacks
- [ ] Maintenance/external probes have short timeouts and fail open
- [ ] Auth gate does not re-fetch on every client navigation
- [ ] Payment/SMS never called on dashboard mount
- [ ] Payment callbacks are idempotent
- [ ] SMS has idempotency + timeout
- [ ] Empty `catch` blocks reviewed
- [ ] Health endpoint reports DB + pool without secrets
- [ ] Production build passes typecheck
