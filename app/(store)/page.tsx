'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import ProductCard, {
  type ColorVariant,
  getColorHex,
} from '@/components/ProductCard';
import AnimatedSection, { AnimatedGrid } from '@/components/AnimatedSection';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle('');
  const { getSetting, getActiveBanners } = useCMS();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const heroSlides = [
    { src: '/hero-home-1.png', position: '50% 40%' },
    { src: '/hero-home-2.png', position: '50% 35%' },
  ];
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          supabase
            .from('products')
            .select('*, product_variants(*), product_images(*)')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('categories')
            .select('id, name, slug, parent_id, position, metadata, image_url')
            .eq('status', 'active')
            .contains('metadata', { featured: true })
            .is('parent_id', null)
            .order('position', { ascending: true })
            .limit(4),
        ]);

        if (productsResult.error) throw productsResult.error;
        setFeaturedProducts(productsResult.data || []);

        if (categoriesResult.error) throw categoriesResult.error;
        setFeaturedCategories(categoriesResult.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const heroHeadline =
    getSetting('hero_headline') || 'China Wholesale, Straight to Ghana';
  const heroSubheadline =
    getSetting('hero_subheadline') ||
    'Shein bales, mannequins and home appliances at unbeatable wholesale prices — perfect for resellers, boutiques and bulk buyers.';
  const heroPrimaryText = getSetting('hero_primary_btn_text') || 'Shop Now';
  const heroPrimaryLink = getSetting('hero_primary_btn_link') || '/shop';
  const heroSecondaryText =
    getSetting('hero_secondary_btn_text') || 'Browse Collections';
  const heroSecondaryLink = getSetting('hero_secondary_btn_link') || '/shop';

  const activeBanners = getActiveBanners('top');

  const renderBanners = () => {
    if (activeBanners.length === 0) return null;
    return (
      <div className="bg-brand-brown text-white py-2 overflow-hidden relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {activeBanners.concat(activeBanners).map((banner, index) => (
            <span
              key={index}
              className="mx-8 text-sm font-medium tracking-wide flex items-center"
            >
              {banner.title}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const popularProducts = featuredProducts.slice(0, 6);
  const defaultCategoryStyles = [
    {
      chip: 'Everyday comfort',
      icon: 'ri-shirt-line',
      color: 'from-brand-carton to-brand-brown',
    },
    {
      chip: 'Premium looks',
      icon: 'ri-vip-crown-line',
      color: 'from-[#C9A24E] to-[#141414]',
    },
    {
      chip: 'Event ready',
      icon: 'ri-t-shirt-air-line',
      color: 'from-brand-brown to-brand-gold',
    },
    {
      chip: 'Just landed',
      icon: 'ri-sparkling-line',
      color: 'from-[#141414]/70 to-[#141414]',
    },
  ];
  const fallbackCategories = [
    { name: 'Shein Bales', slug: 'shein-bales', metadata: {} },
    { name: 'Mannequins', slug: 'mannequins', metadata: {} },
    { name: 'Home Appliances', slug: 'appliances', metadata: {} },
    { name: 'New Arrivals', slug: 'new-arrivals', metadata: {} },
  ];
  const vibeCategories = (featuredCategories.length > 0
    ? featuredCategories
    : fallbackCategories
  )
    .slice(0, 4)
    .map((category, index) => {
      const style = defaultCategoryStyles[index % defaultCategoryStyles.length];
      return {
        ...category,
        chip: category.metadata?.chip || style.chip,
        icon: category.metadata?.icon || style.icon,
        color: category.metadata?.color || style.color,
        image: (category as any).image_url || category.metadata?.image || '',
      };
    });

  return (
    <main className="flex-col items-center justify-between min-h-screen bg-white">
      {renderBanners()}

      <section className="relative w-full min-h-[92vh] sm:min-h-[83vmin] md:min-h-[93vmin] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentHeroSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <Image
                src={slide.src}
                alt=""
                fill
                priority={index === 0}
                quality={90}
                sizes="100vw"
                className="object-cover"
                style={{
                  objectPosition: slide.position,
                  filter: 'contrast(1.06) saturate(1.05)',
                }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 text-center">
          <span className="inline-flex items-center rounded-full bg-white/15 border border-white/25 px-3 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-white/95 mb-4 sm:mb-5">
            Wholesale Queen · China Wholesale
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem] font-extrabold leading-tight text-white drop-shadow-sm max-w-3xl mx-auto">
            {heroHeadline}
          </h1>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-white/90 max-w-xl mx-auto px-2 sm:px-0">
            {heroSubheadline}
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link
              href={heroPrimaryLink}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-brand-brown px-6 py-2.5 sm:px-9 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-[#3D2A00] transition-colors"
            >
              {heroPrimaryText}
              <i className="ri-arrow-right-up-line ml-2 text-base" />
            </Link>
            <Link
              href={heroSecondaryLink}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border-2 border-white/50 px-6 py-2.5 sm:px-9 sm:py-3 text-sm sm:text-base font-semibold text-white hover:bg-white hover:text-gray-900 transition-colors"
            >
              {heroSecondaryText}
            </Link>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            {heroSlides.map((slide, index) => (
              <span
                key={`dot-${slide.src}`}
                className={`h-2 rounded-full transition-all ${
                  index === currentHeroSlide ? 'w-6 bg-white' : 'w-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <AnimatedSection className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-7 sm:mb-9">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.28em] text-brand-carton uppercase">
                <span className="h-px w-7 bg-brand-carton/50" />
                Collections
              </p>
              <Link
                href="/categories"
                aria-label="All Categories"
                className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A24E]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#C9A24E] hover:to-[#9C7A2E] hover:border-transparent hover:text-white hover:shadow-[0_12px_26px_-12px_rgba(201,162,78,0.95)]"
              >
                <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#141414]">
              Shop by Category
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
            {vibeCategories.map((item) => (
              <Link
                key={item.slug}
                href={`/shop?category=${encodeURIComponent(item.slug)}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-[#141414]"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <span className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
                )}

                {/* readability gradient */}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                {/* gold ring on hover */}
                <span aria-hidden="true" className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#C9A24E]/70" />

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight text-white drop-shadow-sm">
                    {item.name}
                  </h3>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 opacity-0 -translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    Shop now
                    <i className="ri-arrow-right-line" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold tracking-[0.25em] text-brand-carton uppercase">
                  Trending now
                </p>
                {/* mobile arrow — inline with the eyebrow */}
                <Link
                  href="/shop?sort=bestsellers"
                  aria-label="View bestselling products"
                  className="group md:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A24E]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#C9A24E] hover:to-[#9C7A2E] hover:border-transparent hover:text-white hover:shadow-[0_12px_26px_-12px_rgba(201,162,78,0.95)]"
                >
                  <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">
                Products customers love most
              </h2>
            </div>
            {/* desktop arrow */}
            <Link
              href="/shop?sort=bestsellers"
              aria-label="View bestselling products"
              className="group hidden md:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C9A24E]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#C9A24E] hover:to-[#9C7A2E] hover:border-transparent hover:text-white hover:shadow-[0_12px_26px_-12px_rgba(201,162,78,0.95)]"
            >
              <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-square rounded-2xl mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <AnimatedGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {popularProducts.map((product) => {
                const variants = product.product_variants || [];
                const hasVariants = variants.length > 0;
                const minVariantPrice = hasVariants
                  ? Math.min(
                      ...variants.map((v: any) => v.price || product.price)
                    )
                  : undefined;
                const totalVariantStock = hasVariants
                  ? variants.reduce(
                      (sum: number, v: any) => sum + (v.quantity || 0),
                      0
                    )
                  : 0;
                const effectiveStock = hasVariants
                  ? totalVariantStock
                  : product.quantity;

                const colorVariants: ColorVariant[] = [];
                const seenColors = new Set<string>();
                for (const v of variants) {
                  const colorName = (v as any).option2;
                  if (
                    colorName &&
                    !seenColors.has(colorName.toLowerCase().trim())
                  ) {
                    const hex = getColorHex(colorName);
                    if (hex) {
                      seenColors.add(colorName.toLowerCase().trim());
                      colorVariants.push({ name: colorName.trim(), hex });
                    }
                  }
                }

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.compare_at_price}
                    image={
                      product.product_images?.[0]?.url ||
                      'https://via.placeholder.com/400x500'
                    }
                    rating={product.rating_avg || 5}
                    reviewCount={product.review_count || 0}
                    badge={product.featured ? 'Featured' : 'Trending'}
                    inStock={effectiveStock > 0}
                    maxStock={effectiveStock || 50}
                    moq={product.moq || 1}
                    hasVariants={hasVariants}
                    minVariantPrice={minVariantPrice}
                    colorVariants={colorVariants}
                  />
                );
              })}
            </AnimatedGrid>
          )}
        </div>
      </AnimatedSection>

      <AnimatedSection className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <p className="text-xs font-semibold tracking-[0.25em] text-brand-carton uppercase">
              Why customers stay with us
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Your trusted wholesale plug
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              We bring China wholesale straight to Ghana — Shein bales, mannequins and appliances
              at prices that let resellers and shop owners make real profit.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: 'ri-price-tag-3-line',
                title: 'Wholesale prices',
                body: 'Buy bales and bulk stock at true wholesale rates — built for resellers.',
              },
              {
                icon: 'ri-customer-service-2-line',
                title: 'Real support',
                body: 'Chat with us on WhatsApp for help choosing the right bales and stock.',
              },
              {
                icon: 'ri-truck-line',
                title: 'Delivery in Ghana',
                body: 'Fast delivery across Ghana, plus pickup at our Ashongman Estate shop.',
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-[#141414]/[0.07] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A24E]/45 hover:shadow-[0_20px_44px_-24px_rgba(20,20,20,0.55)]"
              >
                {/* index watermark + hover accent bar */}
                <span className="pointer-events-none absolute right-5 top-3 select-none text-5xl font-black text-[#C9A24E]/10">
                  0{i + 1}
                </span>
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#C9A24E] to-[#E89DB5] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white shadow-[0_12px_26px_-12px_rgba(201,162,78,0.95)] transition-transform duration-300 group-hover:scale-105">
                    <i className={`${item.icon} text-2xl`} />
                  </div>
                  <h3 className="text-lg font-bold text-[#141414] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      <section className="pb-12 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#141414] text-white shadow-[0_28px_70px_-34px_rgba(20,20,20,0.95)] ring-1 ring-[#C9A24E]/20">
            {/* ambient brand glows */}
            <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24E]/25 blur-[110px]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-[#E89DB5]/15 blur-[110px]" />

            <div className="relative flex flex-col md:flex-row items-stretch">
              <div className="relative z-10 w-full md:w-[55%] px-6 sm:px-10 lg:px-14 py-10 sm:py-14 flex flex-col justify-center text-center md:text-left">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#D8B85F] mx-auto md:mx-0">
                  <span className="h-px w-6 bg-[#D8B85F]/60" />
                  Start buying with Wholesale Queen
                </span>
                <h3 className="mt-4 text-2xl sm:text-3xl lg:text-[2.6rem] lg:leading-[1.1] font-extrabold">
                  Quality wholesale,<br className="hidden sm:block" /> without breaking the bank.
                </h3>
                <span aria-hidden="true" className="mt-4 mx-auto md:mx-0 block h-1 w-16 rounded-full bg-gradient-to-r from-[#C9A24E] to-[#E89DB5]" />
                <p className="mt-5 text-sm sm:text-base text-white/70 max-w-md mx-auto md:mx-0">
                  Whether you&apos;re stocking a shop, starting a clothing business, or buying in
                  bulk — we bring you Shein bales, mannequins and appliances at wholesale prices.
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
                    href="/account"
                    className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors"
                  >
                    Create an account
                  </Link>
                </div>
              </div>

              <div className="relative w-full md:w-[45%] min-h-[15rem] md:min-h-[24rem]">
                <Image
                  src="/hero-home-1.png"
                  alt="Wholesale Queen products"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 45vw"
                />
                {/* blend image into the dark panel */}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#141414] via-[#141414]/40 md:via-[#141414]/30 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
