'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCMS } from '@/context/CMSContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import AnimatedSection, { AnimatedGrid } from '@/components/AnimatedSection';

type ValueCard = {
  icon: string;
  title: string;
  body: string;
};

type JourneyStep = {
  label: string;
  title: string;
  body: string;
};

export default function AboutPage() {
  usePageTitle('Our Story');
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || 'Wholesale Queen';

  const valueCards: ValueCard[] = [
    {
      icon: 'ri-eye-line',
      title: 'Transparency first',
      body: "We believe in honest pricing, clear communication, and no hidden costs — so you always know exactly what you're getting.",
    },
    {
      icon: 'ri-shield-check-line',
      title: 'Quality assurance',
      body: 'Every product is carefully sourced and inspected to ensure it meets our standards before it reaches you.',
    },
    {
      icon: 'ri-hand-heart-line',
      title: 'Long-term relationships',
      body: "We don't just fulfil orders — we build trust with every customer, one delivery at a time.",
    },
  ];

  const journeySteps: JourneyStep[] = [
    {
      label: '01',
      title: 'Browse & choose',
      body: 'Pick your Shein bales, mannequins or appliances online, or message us on WhatsApp and we will help you choose the right stock.',
    },
    {
      label: '02',
      title: 'Order & pay',
      body: 'Place your order and pay securely with Mobile Money, card or bank transfer. Cash on delivery is available within Accra.',
    },
    {
      label: '03',
      title: 'Delivery or pickup',
      body: 'We deliver across Ghana, or you can collect your order from our shop at Ashongman Estate, Accra.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ───────── Hero — dark editorial ───────── */}
      <section className="relative overflow-hidden bg-[#141414] text-white">
        <span aria-hidden="true" className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#C9A24E]/25 blur-[120px]" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-[#E89DB5]/15 blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <AnimatedSection className="lg:col-span-6" animation="fade-up">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.28em] uppercase text-[#D8B85F]">
                <span className="h-px w-7 bg-[#D8B85F]/60" />
                About {siteName}
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05] font-extrabold">
                China wholesale,
                <span className="block bg-gradient-to-r from-[#D8B85F] via-[#C9A24E] to-[#E89DB5] bg-clip-text text-transparent">
                  straight to Ghana.
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-white/70 max-w-xl">
                Wholesale Queen brings you Shein bales, mannequins and home appliances at unbeatable wholesale prices — making bulk buying simple and affordable for resellers, boutiques and anyone who wants quality without paying retail.
              </p>

              <div className="mt-7 flex flex-wrap gap-2.5">
                {['Direct from China', 'Ashongman Estate, Accra', 'Built for resellers'].map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full border border-[#C9A24E]/30 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/80">
                    <i className="ri-checkbox-circle-line mr-2 text-[#D8B85F]" /> {t}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] px-8 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-12px_rgba(201,162,78,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all"
                >
                  Browse products
                  <i className="ri-arrow-right-up-line ml-2" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors"
                >
                  Contact our team
                </Link>
              </div>
            </AnimatedSection>

            <AnimatedSection className="lg:col-span-6" animation="fade-left">
              <div className="relative">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="relative overflow-hidden rounded-3xl aspect-[4/5] ring-1 ring-[#C9A24E]/30">
                    <Image src="/hero-about-1.png" alt="Wholesale Queen products" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 33vw" />
                  </div>
                  <div className="relative overflow-hidden rounded-3xl aspect-[4/5] ring-1 ring-[#C9A24E]/30 mt-10">
                    <Image src="/hero-about-2.png" alt="Wholesale Queen sourcing" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 33vw" />
                  </div>
                </div>
                {/* floating stat card */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white">
                    <i className="ri-shield-check-line text-lg" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-[#141414] leading-none">Quality checked</p>
                    <p className="text-xs text-gray-500 mt-1">Every bale, every order</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ───────── Core values ───────── */}
      <AnimatedSection className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#C9A24E]">
              Our core values
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#141414]">
              Built on trust, driven by quality.
            </h2>
          </div>

          <AnimatedGrid className="mt-10 grid gap-5 md:grid-cols-3" staggerDelay={120}>
            {valueCards.map((item) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-[#141414]/[0.07] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A24E]/45 hover:shadow-[0_20px_44px_-24px_rgba(20,20,20,0.55)]"
              >
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#C9A24E] to-[#E89DB5] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white shadow-[0_12px_26px_-12px_rgba(201,162,78,0.95)] transition-transform duration-300 group-hover:scale-105">
                  <i className={`${item.icon} text-2xl`} />
                </div>
                <h3 className="text-lg font-bold text-[#141414]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.body}</p>
              </div>
            ))}
          </AnimatedGrid>
        </div>
      </AnimatedSection>

      {/* ───────── Vision / Mission split ───────── */}
      <section className="pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Vision — dark */}
            <div className="relative overflow-hidden rounded-3xl bg-[#141414] text-white p-8 sm:p-10">
              <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#C9A24E]/20 blur-3xl" />
              <div className="relative">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white">
                  <i className="ri-lightbulb-line text-2xl" />
                </div>
                <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#D8B85F] mb-2">Our Vision</p>
                <h3 className="text-xl font-bold mb-2">Making wholesale accessible</h3>
                <p className="text-sm leading-relaxed text-white/70">
                  To make quality goods affordable for every Ghanaian hustler and reseller — without breaking the bank.
                </p>
              </div>
            </div>
            {/* Mission — cream */}
            <div className="relative overflow-hidden rounded-3xl border border-[#C9A24E]/25 bg-gradient-to-br from-[#F7F0E1] to-[#F2E9D5] p-8 sm:p-10">
              <div className="relative">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#141414] text-[#D8B85F]">
                  <i className="ri-compass-3-line text-2xl" />
                </div>
                <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#9C7A2E] mb-2">Our Mission</p>
                <h3 className="text-xl font-bold text-[#141414] mb-2">Ghana&apos;s trusted wholesale plug</h3>
                <p className="text-sm leading-relaxed text-[#141414]/70">
                  To be Ghana&apos;s most trusted China-wholesale partner — delivering Shein bales, mannequins and appliances at the best prices, one order at a time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── How it works — timeline ───────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-[#C9A24E]">
              How it works
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#141414]">
              From our shop to your doorstep.
            </h2>
          </div>

          <div className="relative mt-12 grid gap-8 lg:grid-cols-3">
            {/* connecting line */}
            <span aria-hidden="true" className="hidden lg:block absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-[#C9A24E]/0 via-[#C9A24E]/40 to-[#C9A24E]/0" />
            {journeySteps.map((step) => (
              <div key={step.label} className="relative">
                <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-lg font-black text-white shadow-[0_14px_30px_-14px_rgba(201,162,78,0.95)] ring-4 ring-white">
                  {step.label}
                </div>
                <h3 className="text-lg font-bold text-[#141414]">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA — immersive black ───────── */}
      <section className="pb-12 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#141414] text-white shadow-[0_28px_70px_-34px_rgba(20,20,20,0.95)] ring-1 ring-[#C9A24E]/20">
            <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24E]/25 blur-[110px]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-[#E89DB5]/15 blur-[110px]" />
            <div className="relative flex flex-col md:flex-row items-stretch">
              <div className="relative z-10 w-full md:w-[55%] px-6 sm:px-10 lg:px-14 py-10 sm:py-14 flex flex-col justify-center text-center md:text-left">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#D8B85F] mx-auto md:mx-0">
                  <span className="h-px w-6 bg-[#D8B85F]/60" />
                  Start buying with Wholesale Queen
                </span>
                <h3 className="mt-4 text-2xl sm:text-3xl lg:text-[2.4rem] lg:leading-[1.1] font-extrabold">
                  Quality wholesale, without breaking the bank.
                </h3>
                <span aria-hidden="true" className="mt-4 mx-auto md:mx-0 block h-1 w-16 rounded-full bg-gradient-to-r from-[#C9A24E] to-[#E89DB5]" />
                <p className="mt-5 text-sm sm:text-base text-white/70 max-w-md mx-auto md:mx-0">
                  Whether you&apos;re stocking a shop, starting a clothing business, or buying in bulk — we bring you Shein bales, mannequins and appliances at wholesale prices.
                </p>
                <div className="mt-7 flex flex-wrap gap-3 justify-center md:justify-start">
                  <Link
                    href="/shop"
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] text-white px-8 py-3 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(201,162,78,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all"
                  >
                    Start shopping
                    <i className="ri-arrow-right-up-line ml-2" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors"
                  >
                    Talk to us
                  </Link>
                </div>
              </div>
              <div className="relative w-full md:w-[45%] min-h-[15rem] md:min-h-[24rem]">
                <Image src="/hero-about-1.png" alt="Wholesale Queen products" fill className="object-cover" sizes="(max-width: 768px) 100vw, 45vw" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#141414] via-[#141414]/40 md:via-[#141414]/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
