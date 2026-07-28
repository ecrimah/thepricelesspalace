# New Project

Clean e-commerce foundation prepared from a neutralized prior repository. Branding, marketing content, credentials, and business-specific assets have been removed. Replace placeholders with your new project requirements.

## Plain Postgres (Shape A)

No hosted Supabase. Runtime has **zero** `@supabase/*`. Browser uses `/rest/v1`, `/auth/v1`, `/storage/v1` shims; server uses `pg` via `DATABASE_URL`.

Docs: [`docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md`](docs/SUPABASE_TO_POSTGRES_MIGRATION_GUIDE.md), [`docs/STORE_HARDENING_PLAYBOOK.md`](docs/STORE_HARDENING_PLAYBOOK.md).

## Technology stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Plain Postgres (`pg` pool) + local JWT auth + disk storage
- Optional payments: Hubtel, Moolre, Paystack
- Optional email: Resend
- Optional SMS: Moolre VAS
- Optional AI chat: Groq

## Prerequisites

- Node.js 20+
- npm
- Postgres database (local or `sudo fleet db provision palace` → `store_palace`)

## Installation

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL, cutover trio, AUTH_JWT_SECRET, ADMIN_PASSWORD
npm run dev
```

Dev server defaults to `http://localhost:3001`.

## Environment setup

Copy `.env.example` to `.env.local` and set the **cutover trio** together:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |
| `NEXT_PUBLIC_SUPABASE_URL` | **App origin** (e.g. `http://localhost:3001`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Any non-empty client key |
| `AUTH_JWT_SECRET` | JWT signing secret |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |
| `STORAGE_ROOT` | Disk upload root (default `./uploads`) |
| `ADMIN_PASSWORD` | Required for `npm run create-admin` |

Indexing is disabled unless `NEXT_PUBLIC_ALLOW_INDEXING=true`.

## Database setup

1. Provision DB: `sudo fleet db provision palace` (or local Postgres `store_palace`).
2. Apply migrations:

```bash
psql "$DATABASE_URL" -f db/migrations/001_plain_postgres.sql
psql "$DATABASE_URL" -f db/migrations/002_uuid_id_defaults.sql
```

3. Create an admin user:

```bash
# Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local first
npm run create-admin
```

Seed data is limited to roles, modules, and generic delivery-zone scaffolding.

## Development commands

```bash
npm run dev          # http://localhost:3001
npm run lint         # ESLint
npm run build        # Production build
npm run create-admin # Bootstrap admin user
```

## Testing

No automated test suite is included in this starter. Add tests as you introduce new project requirements. Until then, verify:

1. `npm run lint`
2. `npm run build`
3. Manual smoke of `/`, `/shop`, `/auth/login`, `/admin/login`

## Deployment notes

- Configure all production env vars in your host (Vercel, Coolify, etc.).
- Point `NEXT_PUBLIC_APP_URL` at the live domain.
- Rotate every credential that may have been used by the previous project.
- Enable indexing only after content and legal pages are finalized.
- Payment webhooks must target your new domain’s `/api/payment/*/callback` routes.

## Folder structure

```
app/
  (store)/     # Customer storefront routes
  admin/       # Admin dashboard
  api/         # REST / route handlers
components/    # Shared UI
context/       # Cart, wishlist, CMS defaults
hooks/
lib/           # Auth, payments, notifications, Supabase clients
public/        # Neutral placeholder assets
scripts/       # Admin bootstrap, RLS helpers, asset generator
supabase/      # SQL migrations
```

## Available reusable modules

- Customer auth (login, signup, password reset)
- Admin auth + role/staff modules
- Catalog, categories, inventory
- Cart, checkout, orders, order tracking
- Wishlist, coupons, reviews
- Delivery zones / riders scaffolding
- Support tickets + chat widget scaffolding
- PWA manifest / service worker (neutral branding)
- Payment architecture (Hubtel / Moolre / Paystack) — inactive without keys
- Email / SMS notification helpers — inactive without keys

## Removed / disabled integrations

Previous brand domains, logos, marketing copy, and hardcoded project IDs were removed. Integrations remain as code but stay inactive until you supply credentials:

- Hubtel, Moolre, Paystack
- Resend email
- Moolre SMS
- Google Analytics / reCAPTCHA / Groq

## Configuration placeholders

| Placeholder | Meaning |
|-------------|---------|
| `New Project` | Temporary product name |
| `New Company` | Temporary legal/entity name |
| `hello@example.com` | Contact email |
| `+1 000 000 0000` | Contact phone |
| `Address TBD` | Physical address |
| Neutral blue/gray tokens | Temporary design system |

## Security notes

- Never commit `.env.local` or real keys.
- Secrets that appeared in prior git history or chat logs must be **rotated**, not merely deleted from the working tree.
- Default admin passwords are not shipped; set `ADMIN_PASSWORD` yourself.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.

## Adding new project content

1. Replace logos in `public/` (`logo.png`, `logo-white.png`, favicons, OG images).
2. Update CMS defaults in `context/CMSContext.tsx`.
3. Rewrite About, Contact, FAQs, Terms, Privacy, Shipping, Returns.
4. Add products/categories via admin (or seed scripts you create).
5. Configure payment and notification env vars.
6. Set `NEXT_PUBLIC_ALLOW_INDEXING=true` when ready.

See `REPOSITORY_RESET_REPORT.md` for the full cleanup record.
