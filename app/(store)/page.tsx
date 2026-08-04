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
import { BRAND } from '@/lib/brand';

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compare_at_price?: number;
  quantity?: number;
  moq?: number;
  featured?: boolean;
  rating_avg?: number;
  review_count?: number;
  metadata?: { availability?: string; preorder_shipping?: string | null };
  product_variants?: Array<{ price?: number; quantity?: number; option2?: string }>;
  product_images?: Array<{ url: string }>;
};

type CategoryRow = {
  id?: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  position?: number;
  metadata?: { chip?: string; icon?: string; color?: string; image?: string; featured?: boolean };
  image_url?: string;
};

const HERO_SLIDES = [
  { src: '/hero-home-1.webp', position: '50% 40%' },
  { src: '/hero-home-2.webp', position: '50% 35%' },
];

export default function Home() {
  usePageTitle('');
  const { getSetting, getActiveBanners } = useCMS();
  const [featuredProducts, setFeaturedProducts] = useState<ProductRow[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

  const siteName = getSetting('site_name') || BRAND.name;

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          supabase
            .from('products')
            .select('*, product_variants(*), product_images(*)')
            .eq('status', 'active')
            .eq('featured', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('categories')
            .select('id, name, slug, parent_id, position, metadata, image_url')
            .eq('status', 'active')
            .is('parent_id', null)
            .order('position', { ascending: true })
            .limit(4),
        ]);

        if (!productsResult.error) {
          setFeaturedProducts((productsResult.data as ProductRow[]) || []);
        }
        if (!categoriesResult.error) {
          setFeaturedCategories((categoriesResult.data as CategoryRow[]) || []);
        }
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const heroHeadline =
    getSetting('hero_headline') || 'Fashion & Style, Right Here in Accra';
  const heroSubheadline =
    getSetting('hero_subheadline') ||
    `${BRAND.tagline} at ${BRAND.name} — shop online, order on WhatsApp, or visit us at ${BRAND.address}.`;
  const heroPrimaryText = getSetting('hero_primary_btn_text') || 'Shop Now';
  const heroPrimaryLink = getSetting('hero_primary_btn_link') || '/shop';
  const heroSecondaryText = getSetting('hero_secondary_btn_text') || 'Browse Collections';
  const heroSecondaryLink = getSetting('hero_secondary_btn_link') || '/categories';

  const activeBanners = getActiveBanners('top');

  const renderBanners = () => {
    if (activeBanners.length === 0) return null;
    return (
      <div className="bg-brand-brown text-white py-2 overflow-hidden relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {activeBanners.concat(activeBanners).map((banner, index) => (
            <span key={index} className="mx-8 text-sm font-medium tracking-wide flex items-center">
              {banner.title}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Show all featured active products; missing images use the card placeholder.
  const popularProducts = featuredProducts;

  const defaultCategoryStyles = [
    { chip: 'Everyday style', icon: 'ri-t-shirt-line', color: 'from-brand-carton to-brand-brown' },
    { chip: 'Statement pieces', icon: 'ri-handbag-line', color: 'from-[#2563eb] to-[#1e40af]' },
    { chip: 'Comfort first', icon: 'ri-footprint-line', color: 'from-brand-brown to-brand-gold' },
    { chip: 'Just landed', icon: 'ri-sparkling-line', color: 'from-[#1e40af]/70 to-[#1e40af]' },
  ];

  const fallbackCategories: CategoryRow[] = [
    { name: 'Dresses', slug: 'dresses', metadata: {} },
    { name: 'Bags', slug: 'bags', metadata: {} },
    { name: 'Slippers', slug: 'slippers', metadata: {} },
    { name: 'Wigs', slug: 'wigs', metadata: {} },
  ];

  const vibeCategories = (featuredCategories.length > 0 ? featuredCategories : fallbackCategories)
    .slice(0, 4)
    .map((category, index) => {
      const style = defaultCategoryStyles[index % defaultCategoryStyles.length];
      return {
        ...category,
        chip: category.metadata?.chip || style.chip,
        icon: category.metadata?.icon || style.icon,
        color: category.metadata?.color || style.color,
        image: category.image_url || category.metadata?.image || '',
      };
    });

  return (
    <main className="flex-col items-center justify-between min-h-screen bg-white">
      {renderBanners()}

      {/* Hero slideshow */}
      <section className="relative w-full min-h-[92vh] sm:min-h-[83vmin] md:min-h-[93vmin] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {HERO_SLIDES.map((slide, index) => (
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
                sizes="100vw"
                unoptimized
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
            {siteName}
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
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full bg-brand-brown px-6 py-2.5 sm:px-9 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-lg hover:bg-[#1d4ed8] transition-colors"
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
            {HERO_SLIDES.map((slide, index) => (
              <button
                key={`dot-${slide.src}`}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setCurrentHeroSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentHeroSlide ? 'w-6 bg-white' : 'w-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Shop by category */}
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
                className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2563eb]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#2563eb] hover:to-[#1d4ed8] hover:border-transparent hover:text-white hover:shadow-[0_12px_26px_-12px_rgba(37,99,235,0.95)]"
              >
                <i className="ri-arrow-right-line text-lg transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1e40af]">
              Shop by Category
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-2 lg:grid-cols-4">
            {vibeCategories.map((item) => (
              <Link
                key={item.slug}
                href={`/shop?search=${encodeURIComponent(item.name.toLowerCase())}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-[#1e40af]"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    quality={70}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <span className={`absolute inset-0 bg-gradient-to-br ${item.color}`} />
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <span aria-hidden="true" className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#2563eb]/70" />
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

      {/* Trending products */}
      <AnimatedSection className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-semibold tracking-[0.25em] text-brand-carton uppercase">
                  Trending now
                </p>
                <Link
                  href="/shop?sort=bestsellers"
                  aria-label="View bestselling products"
                  className="group md:hidden inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2563eb]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#2563eb] hover:to-[#1d4ed8] hover:border-transparent hover:text-white"
                >
                  <i className="ri-arrow-right-line text-lg" />
                </Link>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">
                Products customers love most
              </h2>
            </div>
            <Link
              href="/shop"
              aria-label="View all products"
              className="group hidden md:inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#2563eb]/35 text-brand-brown transition-all duration-300 hover:bg-gradient-to-br hover:from-[#2563eb] hover:to-[#1d4ed8] hover:border-transparent hover:text-white"
            >
              <i className="ri-arrow-right-line text-lg" />
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
          ) : popularProducts.length > 0 ? (
            <AnimatedGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {popularProducts.map((product) => {
                const variants = product.product_variants || [];
                const hasVariants = variants.length > 0;
                const minVariantPrice = hasVariants
                  ? Math.min(...variants.map((v) => v.price || product.price))
                  : undefined;
                const totalVariantStock = hasVariants
                  ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                  : 0;
                const effectiveStock = hasVariants ? totalVariantStock : product.quantity || 0;

                const colorVariants: ColorVariant[] = [];
                const seenColors = new Set<string>();
                for (const v of variants) {
                  const colorName = v.option2;
                  if (colorName && !seenColors.has(colorName.toLowerCase().trim())) {
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
                    image={product.product_images?.[0]?.url || ''}
                    rating={product.rating_avg || 5}
                    reviewCount={product.review_count || 0}
                    badge={product.featured ? 'Featured' : 'Trending'}
                    availability={
                      product.metadata?.availability === 'preorder' ||
                      (!!product.metadata?.preorder_shipping &&
                        product.metadata?.availability !== 'available')
                        ? 'preorder'
                        : 'available'
                    }
                    preorderShipping={product.metadata?.preorder_shipping || null}
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
          ) : (
            <div className="rounded-3xl border border-brand-carton/20 bg-brand-cream/40 px-6 py-12 text-center">
              <p className="text-lg font-semibold text-[#1e40af]">Catalog coming soon</p>
              <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                Featured products will appear here once the shop is loaded. Call {BRAND.phonePrimary} or chat on WhatsApp to order today.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center rounded-full bg-[#1e40af] text-white px-6 py-2.5 text-sm font-semibold hover:bg-brand-carton transition-colors"
                >
                  Browse shop
                </Link>
                <a
                  href={BRAND.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-[#2563eb]/50 px-6 py-2.5 text-sm font-semibold text-[#1e40af] hover:bg-white transition-colors"
                >
                  <i className="ri-whatsapp-line mr-2" />
                  WhatsApp us
                </a>
              </div>
            </div>
          )}
        </div>
      </AnimatedSection>

      {/* Why us */}
      <AnimatedSection className="bg-white py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-carton uppercase">
              Why customers stay with us
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
              Your trusted fashion palace
            </h2>
            <p className="mt-3 text-sm sm:text-base text-gray-600">
              {BRAND.name} brings you {BRAND.tagline.toLowerCase()} — quality pieces, friendly service, and prices that feel priceless.
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
            {[
              {
                icon: 'ri-price-tag-3-line',
                title: 'Great value',
                body: 'Stylish dresses, bags, slippers and wigs at prices that work for everyday shoppers.',
              },
              {
                icon: 'ri-customer-service-2-line',
                title: 'Real support',
                body: 'Chat with us on WhatsApp for sizing help, orders, and style advice.',
              },
              {
                icon: 'ri-truck-line',
                title: 'Delivery in Ghana',
                body: `Fast delivery across Ghana, plus pickup at ${BRAND.address}.`,
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className="group relative overflow-hidden rounded-2xl border border-[#1e40af]/[0.07] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563eb]/45 hover:shadow-[0_20px_44px_-24px_rgba(20,20,20,0.55)]"
              >
                <span className="pointer-events-none absolute right-5 top-3 select-none text-5xl font-black text-[#2563eb]/10">
                  0{i + 1}
                </span>
                <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#2563eb] to-[#93c5fd] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_12px_26px_-12px_rgba(37,99,235,0.95)] transition-transform duration-300 group-hover:scale-105">
                    <i className={`${item.icon} text-2xl`} />
                  </div>
                  <h3 className="text-lg font-bold text-[#1e40af] mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Promo cards */}
      <AnimatedSection className="pb-12 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Card 1 — image left, text right */}
            <div className="flex flex-col sm:flex-row items-stretch rounded-3xl bg-[#e0f2fe] overflow-hidden min-h-[280px] sm:min-h-[300px]">
              <div className="relative w-full sm:w-[42%] min-h-[200px] sm:min-h-0 shrink-0">
                <Image
                  src="/hero-about-1.webp"
                  alt="Elegant dresses"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, 20vw"
                  quality={75}
                />
              </div>
              <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:py-12 sm:pl-6 sm:pr-10">
                <h3 className="font-serif text-3xl sm:text-[2.15rem] font-bold text-[#1e40af] leading-[1.15]">
                  Elegant
                  <br />
                  Dresses
                </h3>
                <Link
                  href="/shop?search=dress"
                  className="mt-7 inline-flex w-fit items-center justify-center rounded-xl bg-[#1e40af] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#1d4ed8] transition-colors"
                >
                  Shop Now
                </Link>
              </div>
            </div>

            {/* Card 2 — text left, image right */}
            <div className="flex flex-col sm:flex-row items-stretch rounded-3xl bg-[#F5F0E8] overflow-hidden min-h-[280px] sm:min-h-[300px]">
              <div className="flex flex-1 flex-col justify-center px-8 py-10 sm:py-12 sm:pl-10 sm:pr-6 order-2 sm:order-1">
                <h3 className="font-serif text-3xl sm:text-[2.15rem] font-bold text-[#1e40af] leading-[1.15]">
                  Bags &amp;
                  <br />
                  Accessories
                </h3>
                <p className="mt-4 text-sm text-[#1e40af]/65 leading-relaxed max-w-[220px]">
                  Complete your look with handbags, slippers, wigs and more.
                </p>
                <Link
                  href="/shop?search=bag"
                  className="mt-7 inline-flex w-fit items-center justify-center rounded-xl bg-[#1e40af] px-7 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#1d4ed8] transition-colors"
                >
                  Shop Now
                </Link>
              </div>
              <div className="relative w-full sm:w-[42%] min-h-[200px] sm:min-h-0 shrink-0 order-1 sm:order-2">
                <Image
                  src="/hero-about-2.webp"
                  alt="Bags and accessories"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, 20vw"
                  quality={75}
                />
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </main>
  );
}
