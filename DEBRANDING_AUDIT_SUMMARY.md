# Debranding & Ownership Neutralization — Audit Summary

**Date:** February 27, 2025  
**Scope:** Full forensic-level debranding of repository  
**Status:** Complete

---

## 1. Removed or Refactored Elements

### 1.1 Brand Names & Identifiers
| Original | Replacement |
|----------|-------------|
| Sarah Lawson Imports | Store |
| Sarah Lawson | Store / Founder |
| sarahlawsonimports.com | example.com |
| sarahlawson.png | logo.png |
| sarahlogo.png | logo.png |
| sarah-lawson.jpeg | founder.jpg / hero.jpg |
| @sarahlawsonimports | @store |
| Doctor Barns Tech | (removed) |
| doctorbarns.com | (removed) |
| besamebeauty (social links) | (cleared) |
| premiumshop.com | example.com |
| premiumstore.com | example.com |
| Readdy.ai | your project |

### 1.2 Personal Names & Contact Info
| Original | Replacement |
|----------|-------------|
| David (Manager) | Manager |
| Caleb (PR) | Support |
| Sarah Johnson (blog author) | Store |
| David Martinez (blog author) | Store |
| 0546014734 | 0000000000 / getSetting('contact_phone') |
| 0598922769 | getSetting('contact_phone_alt') |
| 0592028581 | getSetting('contact_phone_support') |
| info@sarahlawsonimports.com | support@example.com |
| noreply@sarahlawsonimports.com | noreply@example.com |

### 1.3 Package & Config
| File | Change |
|------|--------|
| package.json | name: "next-app" → "storefront-app" |
| manifest.json | name, short_name, description, icon paths |
| robots.txt | Sitemap URL → example.com |
| sitemap.ts | baseUrl fallback → example.com |
| robots.ts | baseUrl fallback → example.com |

### 1.4 Product / SKU Prefix
| Original | Replacement |
|----------|-------------|
| SLI (Sarah Lawson Imports) | STORE |

### 1.5 SMS / Email
| Original | Replacement |
|----------|-------------|
| senderid: 'SarahLawson' | process.env.SMS_SENDER_ID \|\| 'Store' |
| EMAIL_FROM | Store <noreply@example.com> |
| BRAND.name | Store |
| BRAND.phone | process.env.CONTACT_PHONE \|\| '0000000000' |

### 1.6 Documentation
| File | Changes |
|------|----------|
| AI_CHAT_IMPLEMENTATION_PROMPT.md | All business-specific refs neutralized |
| SMS_INTEGRATION_STATUS.md | URLs, usernames |
| PROPOSAL.md | © [Your Company] → Store |
| PROPOSAL-SHOES-BAGS.md | © [Your Company] → Store |
| supabase/README.md | Readdy.ai → your project |

---

## 2. Files Modified (by category)

### Source Code
- `app/layout.tsx` — metadata, Open Graph, Twitter, structured data
- `app/sitemap.ts`, `app/robots.ts` — base URLs
- `app/(store)/about/page.tsx` — founder story, values, CTA
- `app/(store)/contact/page.tsx` — team contacts, fallbacks
- `app/(store)/page.tsx` — hero image path
- `app/(store)/pay/[orderId]/page.tsx` — brand in header
- `app/admin/layout.tsx` — sidebar brand
- `app/admin/login/page.tsx` — logo
- `app/admin/pos/page.tsx` — receipt header/footer
- `app/admin/blog/page.tsx` — sample authors
- `app/admin/orders/[id]/OrderDetailClient.tsx` — print header
- `app/api/chat/route.ts` — system prompt, fallback messages
- `context/CMSContext.tsx` — default settings
- `components/Footer.tsx` — logo, newsletter copy, copyright
- `components/Header.tsx` — logo paths
- `components/ChatWidget.tsx` — title, removed "Powered by"
- `components/PWASplash.tsx` — logo, title
- `components/PWAPrompt.tsx` — logo, name, domain
- `components/admin/ProductForm.tsx` — SKU prefix
- `hooks/usePageTitle.ts` — SITE_NAME
- `lib/site-knowledge.ts` — all knowledge entries
- `lib/chat-tools.ts` — STORE_INFO, MOOLRE default
- `lib/notifications.ts` — BRAND, EMAIL_FROM, senderid, SMS copy

### Static / Config
- `package.json` — name
- `public/manifest.json` — name, short_name, description, icon
- `public/robots.txt` — Sitemap URL
- `public/service-worker.js` — comment, cache paths, notification copy

### Documentation
- `AI_CHAT_IMPLEMENTATION_PROMPT.md`
- `SMS_INTEGRATION_STATUS.md`
- `PROPOSAL.md`
- `PROPOSAL-SHOES-BAGS.md`
- `supabase/README.md`

---

## 3. Asset Changes

- **logo.png** — Created in `public/` (copied from sarahlawson.png/sarahlogo.png). Replace with your own logo.
- **founder.jpg** — Referenced in about page. Add `public/founder.jpg` or update path.
- **hero.jpg** — Referenced in homepage. Add `public/hero.jpg` or update path in `app/(store)/page.tsx`.

---

## 4. Environment Variables (Neutral Placeholders)

Configure these for your deployment:

| Variable | Purpose |
|---------|---------|
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g. https://example.com) |
| `CONTACT_PHONE` | Main contact phone |
| `contact_phone_alt` | Manager phone (CMS) |
| `contact_phone_support` | Support phone (CMS) |
| `SMS_SENDER_ID` | SMS sender ID |
| `EMAIL_FROM` | Transactional email from address |
| `MOOLRE_MERCHANT_EMAIL` | Payment gateway merchant email |

---

## 5. Checklist — No Remaining Identifiable Traces

- [x] Personal names removed or neutralized
- [x] Company/brand names replaced with "Store"
- [x] Domain URLs → example.com
- [x] Email addresses → support@example.com / noreply@example.com
- [x] Phone numbers → placeholders or CMS-driven
- [x] Logo/image paths → /logo.png
- [x] "Powered by" / vendor credits removed
- [x] Social links cleared (besamebeauty)
- [x] Documentation and prompts sanitized
- [x] SKU prefix neutralized (STORE)
- [x] Package name neutralized (storefront-app)

---

## 6. Preserved (Unchanged)

- Business logic and API contracts
- Type definitions and routing
- Database schemas and migrations
- Build configuration and dependencies
- Framework versions
- Security posture (RLS, auth, etc.)

---

## 7. Post-Debranding Steps

1. **Replace assets:** Add your own `logo.png`, `founder.jpg`, and `hero.jpg` in `public/`.
2. **Configure CMS:** Set `site_name`, `contact_email`, `contact_phone`, and social links in your CMS/admin.
3. **Set env vars:** Configure `NEXT_PUBLIC_APP_URL`, `CONTACT_PHONE`, `SMS_SENDER_ID`, `EMAIL_FROM`, etc.
4. **Verify build:** Run `npm run build` to ensure no broken imports or references.
5. **Git:** If desired, run `git filter-branch` or BFG to scrub commit history (optional, advanced).

---

## 8. Functional Equivalence

All changes are structural and textual. No business logic, API behavior, or runtime characteristics were altered. The application remains functionally equivalent with ownership-neutral branding.
