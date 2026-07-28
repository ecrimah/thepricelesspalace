# Repository Reset Report

**Branch:** `repo-reset/new-project-foundation`  
**Date:** 2026-07-28  
**Previous project identities removed:** Wholesale Queen, Shop With GG, Deliz Beauty, Sarah Lawson Imports remnants

## Summary of the cleanup

The repository was audited and converted into a neutral e-commerce starter. Brand assets, marketing pages, proposals, migration dumps, and hardcoded credentials/project refs were removed or generalized. Commerce architecture (auth, admin, cart, checkout, payments code, delivery, support) was preserved and de-branded.

## Files removed

### Documentation / dumps / logs
- `AI_CHAT_IMPLEMENTATION_PROMPT.md`
- `BRAND MANUAL SHOP WITH GG (1).pdf`
- `CHAT-LOG-2026-03-02.md` (**contained exposed token — rotate**)
- `DEBRANDING_AUDIT_SUMMARY.md`
- `PROPOSAL.md`, `PROPOSAL-SHOES-BAGS.md`
- `SECURITY_AUDIT_PROMPT.md`, `SECURITY_RLS_SETUP.md`
- `SMS_INTEGRATION_STATUS.md`
- `build_log.txt`, `build_errors.log`
- `sql_*.json`, `mig_*.json`, `migration_tables_to_end.sql`
- Root SWGG / brand PNG assets
- `scripts/gen-brand-assets.py`
- `.cursor/debug-0f45e0.log`

### Media
- All Wholesale Queen logos, OG/Twitter images, favicons, PWA icon set
- Hero / marketing photos and orphaned Deliz / nail / Frebys assets

## Files generalized

- `app/layout.tsx` — metadata, robots noindex by default, JSON-LD
- `app/(store)/page.tsx` — starter homepage
- About, Contact, FAQs, Terms, Privacy, Blog, Shipping, Returns, Help
- `components/Header.tsx`, `Footer.tsx`, `SEOHead.tsx`, PWA components, ChatWidget
- `context/CMSContext.tsx` defaults
- `lib/notifications.ts`, `lib/site-knowledge.ts`, `lib/chat-tools.ts`
- Admin login/layout/POS/print/order detail strings
- `public/manifest.json`, `service-worker.js`, `robots.txt`
- `next.config.ts` — removed former API hostnames
- `tailwind.config.js` — neutral design tokens
- RLS scripts — env-based Supabase URL/key (no hardcoded project ref)
- `scripts/create-admin.mjs` — requires `ADMIN_PASSWORD` from env

## Features preserved

- Storefront catalog/cart/checkout/account/wishlist
- Admin dashboard (products, orders, POS, inventory, customers, coupons, delivery, support, roles)
- Supabase auth + middleware protection
- Lazy Supabase clients (`lib/supabase.ts`, `lib/supabase-admin.ts`) so builds work before credentials exist
- Payment route architecture (Hubtel / Moolre / Paystack) — inactive without credentials
- Email/SMS helpers — inactive without credentials
- Chat / support scaffolding
- PWA service worker pattern
- Schema migration `supabase/migrations/20260209000000_complete_schema.sql`

## Features removed / neutralized

- All previous brand marketing narratives
- Hardcoded blog articles and help articles tied to prior stores
- Hardcoded contact/social identities
- Brand-specific design colors (black/gold identity)
- Default weak admin password
- Hardcoded Supabase project `bskojprmfxugvkycvetc` in scripts/docs

## Database changes

- No production database was modified.
- Schema migration retained (roles, modules, generic delivery zones).
- No product/customer/order seed data shipped.
- Recommendation: provision a **new** Supabase project; do not reuse the previous project database.

## Environment-variable changes

### Added / documented in `.env.example`
- `APP_NAME`, `NEXT_PUBLIC_ALLOW_INDEXING`
- Full placeholder list for Supabase, payments, Resend, reCAPTCHA, GA, Groq, cron, admin bootstrap

### Removed from tracked files
- Hardcoded Supabase URL/project ref in scripts
- Brand fallbacks for emails/phones/domains in source defaults (replaced with example.com placeholders)

## Third-party integrations disabled

Until credentials are supplied:

| Integration | Status |
|-------------|--------|
| Hubtel | Code kept, requires env |
| Moolre pay/SMS | Code kept, requires env |
| Paystack | Code kept, requires env |
| Resend | Warns and skips if missing |
| reCAPTCHA | Skips verification if missing |
| Google Analytics | Script only loads if ID set |
| Groq AI chat | Requires `GROQ_API_KEY` |

## Security concerns discovered

| Finding | Action required |
|---------|-----------------|
| Chat log contained Supabase PAT (`sbp_****`) | **Rotate / revoke** immediately if still valid |
| Hardcoded Supabase project ref in old scripts/docs | Removed from working tree; rotate keys for that project |
| Default admin password previously in script | Removed; password must be set via env |
| Git remote / history still named after prior project | History may contain secrets — rotate all former credentials |

**Note:** Removing secrets from the current tree does not remove them from git history. Rotate everything that was ever committed or pasted into chat logs.

## Items requiring manual review

1. Whether Ghana-specific checkout regions / phone validation / delivery-zone seeds should remain for the new project.
2. Which payment gateways the new project will keep.
3. Git remote URL (`wholesalequeen.git`) — repoint when the new repository is ready.
4. Replace solid-color placeholder logos with real brand assets.
5. Legal pages need counsel-reviewed copy before launch.
6. Confirm no live Supabase data from the old project is connected via local `.env.local` (not in repo).

## Recommended next steps

1. Provide new brand name, domain, colors, and logo assets.
2. Create a fresh Supabase project and apply migrations.
3. Set `.env.local` from `.env.example`.
4. Run `npm install`, `npm run create-admin`, `npm run dev`.
5. Add catalog content and rewrite marketing/legal pages.
6. Rotate all credentials associated with the previous project.
