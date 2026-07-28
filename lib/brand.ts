/** The Priceless Palace — store identity (local / starter defaults). */

export const BRAND = {
  name: 'The Priceless Palace',
  shortName: 'Priceless Palace',
  tagline: 'Dresses, bags, slippers, wigs & more',
  description:
    'Shop dresses, bags, slippers, wigs and more at The Priceless Palace — Abavana Down, Queenstar Guest House.',
  address: 'Abavana Down, Queenstar Guest House',
  phonePrimary: '+233 20 178 3800',
  phoneSecondary: '054 559 8755',
  /** Digits only for tel:/wa.me links (primary) */
  phonePrimaryDigits: '233201783800',
  phoneSecondaryDigits: '233545598755',
  email: 'hello@thepricelesspalace.com',
  currency: 'GHS',
  currencySymbol: '₵',
  whatsappUrl: 'https://wa.me/233201783800',
} as const;

export function brandPhoneList(): string {
  return `${BRAND.phonePrimary} · ${BRAND.phoneSecondary}`;
}
