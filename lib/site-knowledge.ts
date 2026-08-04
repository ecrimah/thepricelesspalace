/**
 * Site Knowledge Base — curated facts used by the AI chat assistant.
 */

import { BRAND, brandPhoneList } from '@/lib/brand';
export interface SiteKnowledgeEntry {
  id: string;
  title: string;
  path: string;
  category: string;
  content: string;
  keywords: string[];
}

export const SITE_KNOWLEDGE: SiteKnowledgeEntry[] = [
  {
    id: "business-overview",
    title: `About ${BRAND.name}`,
    path: "/about",
    category: "company",
    content: `${BRAND.name} is a fashion store offering ${BRAND.tagline.toLowerCase()}.

We make shopping simple and affordable — whether you are buying for yourself or stocking up for resale.

Whether you are restocking, starting a side hustle, or buying for personal use, ${BRAND.name} exists to make online shopping easy, reliable, and accessible.

Vision: To make quality fashion affordable for every customer.
Mission: To be a trusted shopping partner — delivering great products at fair prices, one order at a time.

Location: ${BRAND.address}. Delivery available to supported regions.`,
    keywords: [BRAND.shortName.toLowerCase(), "the priceless palace", "online store", "about", "company", "shop", "dresses", "bags", "slippers", "wigs", "affordable"],
  },
  {
    id: "contact-info",
    title: "Contact Information",
    path: "/contact",
    category: "contact",
    content: `Contact ${BRAND.name}:

Phone/WhatsApp: ${brandPhoneList()}
Email: ${BRAND.email}
Address: ${BRAND.address}
Support Hours: Monday to Saturday, 9 AM - 6 PM GMT`,
    keywords: ["contact", "phone", "whatsapp", "email", "address", "support", BRAND.email],
  },
  {
    id: "shipping-policy",
    title: "Shipping & Delivery Policy",
    path: "/shipping",
    category: "shipping",
    content: `${BRAND.name} is based at ${BRAND.address} and delivers to supported regions.

Shipping fees and delivery timelines depend on destination and are shown at checkout. Pickup may be available at our store location.

Customers receive order updates and can track orders using order number and email.`,
    keywords: ["shipping", "delivery", "pickup", "timeline", "tracking", BRAND.shortName.toLowerCase()],
  },
  {
    id: "returns-policy",
    title: "Returns & Refunds Policy",
    path: "/returns",
    category: "returns",
    content: `Returns are accepted for eligible unused items in original condition within 30 days of delivery.

Custom or altered items may not be returnable unless there is a quality issue.

Refunds are processed after item inspection.`,
    keywords: ["returns", "refund", "exchange", "worn", "condition", "30 days"],
  },
  {
    id: "payment-methods",
    title: "Payment Methods",
    path: "/checkout",
    category: "payment",
    content: `Secure payments are processed by Moolre at checkout. Supports mobile money, debit/credit cards, and bank transfer.

Cash on Delivery may be available for eligible orders in supported areas.
All prices are shown in ₵ (GHS) unless otherwise stated.`,
    keywords: ["payment", "moolre", "card", "bank transfer", "mobile money", "momo", "checkout", "secure", "ghs", "cedi"],
  },
  {
    id: "order-tracking-guide",
    title: "How to Track Your Order",
    path: "/order-tracking",
    category: "orders",
    content: `To track an order, go to /order-tracking and provide your order number and email address.

Typical status flow:
Order Placed -> Payment -> Processing -> Packaged -> Dispatched -> Delivered.`,
    keywords: ["track", "order", "status", "order number", "email", "dispatched"],
  },
  {
    id: "faq-summary",
    title: "Frequently Asked Questions",
    path: "/faqs",
    category: "faq",
    content: `FAQs cover orders, shipping, returns, payment, and account support.

Customers can contact support via WhatsApp, email, or support ticket for unresolved issues.`,
    keywords: ["faq", "questions", "support", "orders", "shipping", "returns"],
  },
  {
    id: "legal-summary",
    title: "Privacy & Terms",
    path: "/privacy",
    category: "legal",
    content: `Privacy Policy and Terms explain data handling, order conditions, returns, and user responsibilities.

For legal questions, contact ${BRAND.email}.`,
    keywords: ["privacy", "terms", "legal", "data", "policy"],
  },
  {
    id: "checkout-guide",
    title: "Checkout Process",
    path: "/checkout",
    category: "shopping",
    content: `Checkout steps:
1. Add products to cart
2. Enter shipping details
3. Choose delivery method
4. Complete payment
5. Receive confirmation and tracking updates`,
    keywords: ["checkout", "cart", "payment", "delivery", "order"],
  },
];

/**
 * Search the site knowledge base for relevant entries
 */
export function searchSiteKnowledge(query: string, maxResults = 3): SiteKnowledgeEntry[] {
  const lower = query.toLowerCase();
  const words = lower.split(/\s+/).filter(w => w.length > 2);

  const scored = SITE_KNOWLEDGE.map(entry => {
    let score = 0;

    // Exact keyword matches (highest priority)
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) score += 10;
      for (const word of words) {
        if (kw.includes(word) || word.includes(kw)) score += 3;
      }
    }

    // Title match
    if (entry.title.toLowerCase().includes(lower)) score += 15;
    for (const word of words) {
      if (entry.title.toLowerCase().includes(word)) score += 5;
    }

    // Content match
    const contentLower = entry.content.toLowerCase();
    for (const word of words) {
      if (contentLower.includes(word)) score += 2;
    }

    // Boost FAQ entries slightly (they cover common questions)
    if (entry.category === 'faq') score += 1;

    return { entry, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.entry);
}

/**
 * Get all knowledge entries for a specific category
 */
export function getKnowledgeByCategory(category: string): SiteKnowledgeEntry[] {
  return SITE_KNOWLEDGE.filter(e => e.category === category);
}

/**
 * Build a condensed site map for the system prompt
 */
export function getSiteMapSummary(): string {
  return `WEBSITE PAGES (you can reference these to help customers navigate):
- / — Homepage with featured products, categories, and store info
- /shop — Browse all products with filters (category, price, rating, sort)
- /categories — Shop by category
- /product/[slug] — Individual product pages with details, reviews, variants
- /cart — Shopping cart with coupon support
- /checkout — Checkout flow (shipping → delivery → payment)
- /order-tracking — Track orders by order number + email
- /returns — Start a return request (30-day policy)
- /account — Profile, order history, addresses, security settings
- /wishlist — Saved products
- /about — ${BRAND.name} story and mission
- /contact — Phone numbers, email, WhatsApp, visit info
- /faqs — 25+ frequently asked questions
- /help — Help center with 50+ articles across 6 categories
- /blog — Shopping tips, product guides, and store updates
- /shipping — Detailed shipping & delivery policy
- /privacy — Privacy policy
- /terms — Terms & conditions
- /support/ticket — Create a support ticket
- /support/tickets — View your tickets
- /auth/login — Sign in
- /auth/signup — Create account
- /auth/forgot-password — Reset password`;
}
