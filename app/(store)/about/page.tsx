'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCMS } from '@/context/CMSContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHero from '@/components/PageHero';
import AnimatedSection from '@/components/AnimatedSection';
import { BRAND, brandPhoneList } from '@/lib/brand';

const offerings = [
  {
    title: 'Dresses',
    body: 'Everyday and occasion-ready styles',
    href: '/shop?search=dress',
    image: '/hero-about-1.webp',
    fallback: 'from-[#1e40af] via-[#2a2a2a] to-[#2563eb]',
  },
  {
    title: 'Bags',
    body: 'Handbags & accessories',
    href: '/shop?search=bag',
    image: '/hero-about-2.webp',
    fallback: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
  },
  {
    title: 'Slippers',
    body: 'Comfort for home & outings',
    href: '/shop?search=slipper',
    image: '/hero-shop.webp',
    fallback: 'from-[#1e40af] via-[#5c4a2a] to-[#3b82f6]',
  },
  {
    title: 'Wigs',
    body: 'Fresh styles & quality hair',
    href: '/shop?search=wig',
    image: '/hero-home-2.webp',
    fallback: 'from-[#3b82f6] via-[#2563eb] to-[#1e40af]',
  },
];

const highlights = [
  {
    icon: 'ri-shield-check-line',
    title: 'Quality pieces',
    body: 'Every item is chosen with care so you get value for your money.',
  },
  {
    icon: 'ri-customer-service-2-line',
    title: 'Personal help',
    body: 'Message us on WhatsApp anytime — we help you pick the right fit.',
  },
  {
    icon: 'ri-truck-line',
    title: 'Delivery & pickup',
    body: 'We deliver across Ghana, or collect from our shop in Accra.',
  },
];

export default function AboutPage() {
  usePageTitle('About Us');
  const { getSetting } = useCMS();
  const siteName = getSetting('site_name') || BRAND.name;

  return (
    <div className="min-h-screen bg-white text-[#1e40af]">
      <PageHero
        title="About Us"
        subtitle={`${siteName} — ${BRAND.tagline.toLowerCase()}.`}
        image="/hero-about-1.webp"
      />

      {/* Story */}
      <AnimatedSection className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 lg:items-center">
            <div className="relative aspect-[4/5] sm:aspect-[5/6] lg:aspect-auto lg:min-h-[32rem] overflow-hidden rounded-3xl ring-1 ring-[#2563eb]/20 shadow-[0_24px_60px_-28px_rgba(20,20,20,0.45)]">
              <Image
                src="/hero-about-2.webp"
                alt={`Inside ${siteName}`}
                fill
                className="object-cover transition-transform duration-700 hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={75}
              />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#1e40af]/30 via-transparent to-transparent" />
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.28em] uppercase text-[#2563eb]">
                Our story
              </p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl font-bold leading-tight">
                A palace built for everyday style.
              </h2>
              <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
                <p>
                  {siteName} is a fashion destination in Accra for dresses, bags, slippers, wigs and more.
                  We started with a simple idea: make it easy to look good without overpaying.
                </p>
                <p>
                  Whether you shop online, order on WhatsApp, or walk into our store at{' '}
                  <strong className="text-[#1e40af] font-medium">{BRAND.address}</strong>, you get
                  friendly service and pieces picked for real life — workdays, weekends, and everything in between.
                </p>
              </div>
              <blockquote className="mt-8 border-l-4 border-[#2563eb] pl-5 text-lg font-medium text-[#1e40af] italic">
                &ldquo;Fashion should feel priceless — not overpriced.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* What we sell — editorial category grid */}
      <section className="bg-[#f8fafc] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 sm:mb-14">
            <div className="max-w-xl">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.28em] uppercase text-[#2563eb]">
                <span className="h-px w-8 bg-[#2563eb]/50" />
                What we sell
              </p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#1e40af] leading-tight">
                Everything to complete your look
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                From statement dresses to everyday slippers — browse by category or visit us in store.
              </p>
            </div>
            <Link
              href="/shop"
              className="group inline-flex h-12 w-12 shrink-0 items-center justify-center self-start sm:self-auto rounded-full border border-[#2563eb]/35 text-[#1e40af] transition-all duration-300 hover:bg-gradient-to-br hover:from-[#2563eb] hover:to-[#1d4ed8] hover:border-transparent hover:text-white hover:shadow-[0_12px_26px_-12px_rgba(37,99,235,0.95)]"
              aria-label="View all products"
            >
              <i className="ri-arrow-right-line text-lg transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {offerings.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-[#1e40af] shadow-sm transition-shadow duration-300 hover:shadow-[0_28px_56px_-24px_rgba(20,20,20,0.55)]"
              >
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  quality={75}
                />
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 bg-gradient-to-br ${item.fallback} opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-20`}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#2563eb]/60"
                />

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                  <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-[#60a5fa]/90 mb-1.5">
                    Collection
                  </p>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-white/75 leading-snug line-clamp-2">
                    {item.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white border border-white/15 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    Shop now
                    <i className="ri-arrow-right-line text-sm" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <AnimatedSection className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs font-semibold tracking-[0.28em] uppercase text-[#2563eb]">
                Why shop with us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold leading-tight">
                More than a store — a place you can trust.
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                We keep things simple: good products, honest prices, and real people on the other end of the phone.
              </p>
              <Link
                href="/shop"
                className="mt-8 inline-flex items-center rounded-full bg-[#1e40af] px-7 py-3 text-sm font-semibold text-white hover:bg-[#2563eb] transition-colors"
              >
                Browse the shop
                <i className="ri-arrow-right-line ml-2" />
              </Link>
            </div>

            <div className="space-y-4">
              {highlights.map((item, i) => (
                <div
                  key={item.title}
                  className="group flex gap-5 rounded-2xl border border-[#1e40af]/8 bg-white p-6 sm:p-7 transition-all duration-300 hover:border-[#2563eb]/35 hover:shadow-[0_16px_40px_-24px_rgba(20,20,20,0.4)]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_8px_20px_-10px_rgba(37,99,235,0.9)]">
                    <i className={`${item.icon} text-xl`} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2563eb]">
                      0{i + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                    <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Visit strip */}
      <section className="pb-14 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#1e40af] text-white overflow-hidden">
            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
              <div className="p-8 sm:p-10 text-center md:text-left">
                <i className="ri-map-pin-2-line text-2xl text-[#60a5fa]" />
                <h3 className="mt-4 font-bold text-lg">Visit us</h3>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">{BRAND.address}</p>
                <p className="mt-1 text-xs text-white/50">Mon–Sat, 9am–6pm</p>
              </div>
              <div className="p-8 sm:p-10 text-center md:text-left">
                <i className="ri-phone-line text-2xl text-[#60a5fa]" />
                <h3 className="mt-4 font-bold text-lg">Call us</h3>
                <p className="mt-2 text-sm text-white/70">{brandPhoneList()}</p>
                <a
                  href={BRAND.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-[#60a5fa] hover:text-white transition-colors"
                >
                  <i className="ri-whatsapp-line mr-2 text-lg" />
                  Chat on WhatsApp
                </a>
              </div>
              <div className="p-8 sm:p-10 flex flex-col items-center md:items-start justify-center text-center md:text-left">
                <h3 className="font-serif text-2xl font-bold leading-snug">
                  Ready to shop?
                </h3>
                <p className="mt-2 text-sm text-white/70">
                  Explore our collection or get in touch — we&apos;re happy to help.
                </p>
                <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                  <Link
                    href="/shop"
                    className="inline-flex items-center rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-[#1e40af] hover:bg-[#60a5fa] transition-colors"
                  >
                    Shop now
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
