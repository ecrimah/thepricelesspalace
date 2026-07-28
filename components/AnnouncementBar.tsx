'use client';

import Link from 'next/link';
import { useCMS } from '@/context/CMSContext';
import { BRAND } from '@/lib/brand';

const SOCIAL_LINKS = [
  { key: 'social_facebook', icon: 'ri-facebook-fill', label: 'Facebook' },
  { key: 'social_twitter', icon: 'ri-twitter-x-fill', label: 'X' },
  { key: 'social_pinterest', icon: 'ri-pinterest-fill', label: 'Pinterest' },
  { key: 'social_instagram', icon: 'ri-instagram-fill', label: 'Instagram' },
  { key: 'social_youtube', icon: 'ri-youtube-fill', label: 'YouTube' },
] as const;

export default function AnnouncementBar() {
  const { getSetting } = useCMS();
  const phone = getSetting('contact_phone') || BRAND.phonePrimary;

  const socials = SOCIAL_LINKS.map(({ key, icon, label }) => ({
    href: getSetting(key),
    icon,
    label,
  })).filter((s) => s.href);

  const fallbackSocials =
    socials.length > 0
      ? socials
      : [
          { href: BRAND.whatsappUrl, icon: 'ri-whatsapp-fill', label: 'WhatsApp' },
          { href: getSetting('social_instagram') || '#', icon: 'ri-instagram-fill', label: 'Instagram' },
        ].filter((s) => s.href && s.href !== '#');

  return (
    <div className="bg-[#1e40af] text-white text-[13px] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 min-h-[38px] py-1.5">
          {/* Left — phone */}
          <a
            href={`tel:${BRAND.phonePrimaryDigits}`}
            className="shrink-0 text-white/90 hover:text-[#60a5fa] transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Call Us : </span>
            {phone}
          </a>

          {/* Center — promo */}
          <p className="hidden md:block flex-1 text-center text-white/90 px-4 truncate">
            Sign up and GET 20% OFF for your first order.{' '}
            <Link
              href="/auth/signup"
              className="text-[#60a5fa] underline underline-offset-2 decoration-[#60a5fa]/70 hover:text-white transition-colors font-medium"
            >
              Sign up now
            </Link>
          </p>

          {/* Mobile promo (short) */}
          <Link
            href="/auth/signup"
            className="md:hidden flex-1 text-center text-[#60a5fa] underline underline-offset-2 text-xs font-medium truncate"
          >
            Sign up — 20% OFF
          </Link>

          {/* Right — social */}
          <div className="flex items-center gap-1.5 shrink-0">
            {fallbackSocials.map(({ href, icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#1e40af] hover:bg-[#60a5fa] hover:text-white transition-colors"
              >
                <i className={`${icon} text-[13px]`} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
