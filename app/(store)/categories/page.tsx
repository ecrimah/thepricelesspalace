import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PageHero from '@/components/PageHero';

export const revalidate = 0; // Ensure fresh data on every visit

export default async function CategoriesPage() {
  const { data: categoriesData } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      description,
      image_url,
      position
    `)
    .eq('status', 'active')
    .order('position', { ascending: true });

  // Palette to cycle through for visual variety since DB doesn't have colors
  const palette = [
    { color: 'from-[#C9A24E] to-[#141414]', icon: 'ri-store-2-line' },
    { color: 'from-[#141414] to-[#C9A24E]', icon: 'ri-shopping-bag-3-line' },
    { color: 'from-[#141414] to-[#C9A24E]', icon: 'ri-t-shirt-line' },
    { color: 'from-[#D8B85F] to-[#C9A24E]', icon: 'ri-home-smile-line' },
    { color: 'from-[#9A1900] to-[#141414]', icon: 'ri-heart-line' },
    { color: 'from-[#141414] to-[#C9A24E]', icon: 'ri-star-smile-line' },
  ];

  const categories = categoriesData?.map((c, i) => {
    const style = palette[i % palette.length];
    return {
      ...c,
      image: c.image_url || 'https://via.placeholder.com/600x400?text=Category',
      color: style.color,
      icon: style.icon,
      // Optional: Fetch product count if needed, currently skipping for performance/simplicity
      productCount: 'Browse',
    };
  }) || [];

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        title="Shop by Category"
        subtitle="Explore our curated collections and find exactly what you're looking for"
        image="/hero-categories.png"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-[#141414]"
              >
                {category.image ? (
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <span className={`absolute inset-0 bg-gradient-to-br ${category.color}`}></span>
                )}

                {/* readability gradient */}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></span>
                {/* gold ring on hover */}
                <span aria-hidden="true" className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#C9A24E]/70"></span>

                {/* index */}
                <span className="absolute left-5 top-5 text-[11px] font-semibold tracking-[0.25em] text-white/45">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8B85F]">
                    Collection
                  </p>
                  <h3 className="mt-2 font-serif text-2xl sm:text-3xl font-bold leading-tight text-white drop-shadow-sm">
                    {category.name}
                  </h3>
                  <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                    Browse
                    <span aria-hidden="true" className="h-px w-6 bg-white/50 transition-all duration-300 group-hover:w-10 group-hover:bg-[#C9A24E]"></span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <i className="ri-inbox-line text-5xl text-gray-300 mb-4"></i>
            <p className="text-xl text-gray-500">No categories found.</p>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl bg-[#141414] text-white ring-1 ring-[#C9A24E]/20 shadow-[0_28px_70px_-34px_rgba(20,20,20,0.95)]">
          {/* ambient brand glows */}
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#C9A24E]/25 blur-[110px]" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/4 h-80 w-80 rounded-full bg-[#E89DB5]/15 blur-[110px]" />

          <div className="relative px-6 sm:px-10 py-14 sm:py-16 text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#D8B85F]">
              <span className="h-px w-6 bg-[#D8B85F]/60" />
              Need a hand?
              <span className="h-px w-6 bg-[#D8B85F]/60" />
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold">Can&apos;t find what you&apos;re looking for?</h2>
            <span aria-hidden="true" className="mt-4 mx-auto block h-1 w-16 rounded-full bg-gradient-to-r from-[#C9A24E] to-[#E89DB5]" />
            <p className="mt-5 text-base sm:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
              Search the full catalogue or message our team on WhatsApp for personalised bale and stock recommendations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] text-white px-8 py-3.5 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(201,162,78,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                <i className="ri-search-line"></i>
                Search All Products
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/40 transition-colors whitespace-nowrap"
              >
                <i className="ri-customer-service-2-line"></i>
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
