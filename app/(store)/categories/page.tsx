import Link from 'next/link';
import { isPlainPostgres } from '@/lib/db/mode';
import { createClient } from '@/lib/db/supabase-compat';
import PageHero from '@/components/PageHero';

export const revalidate = 0; // Ensure fresh data on every visit

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number | null;
};

export default async function CategoriesPage() {
  let categoriesData: CategoryRow[] = [];
  if (isPlainPostgres()) {
    const db = createClient();
    const { data } = await db
      .from('categories')
      .select('id, name, slug, description, image_url, position')
      .eq('status', 'active')
      .order('position', { ascending: true });
    categoriesData = (data as CategoryRow[]) || [];
  }

  const palette = [
    { color: 'from-[#2563eb] to-[#1e40af]', icon: 'ri-store-2-line' },
    { color: 'from-[#1e40af] to-[#2563eb]', icon: 'ri-shopping-bag-3-line' },
    { color: 'from-[#1e40af] to-[#2563eb]', icon: 'ri-t-shirt-line' },
    { color: 'from-[#60a5fa] to-[#2563eb]', icon: 'ri-home-smile-line' },
    { color: 'from-[#9A1900] to-[#1e40af]', icon: 'ri-heart-line' },
    { color: 'from-[#1e40af] to-[#2563eb]', icon: 'ri-star-smile-line' },
  ];

  const categories = categoriesData.map((c: CategoryRow, i: number) => {
    const style = palette[i % palette.length];
    return {
      ...c,
      image: c.image_url || '/placeholder-product.webp',
      color: style.color,
      icon: style.icon,
      productCount: 'Browse',
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        title="Shop by Category"
        subtitle="Explore our curated collections and find exactly what you're looking for"
        image="/hero-categories.webp"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-[#1e40af]"
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
                <span aria-hidden="true" className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover:ring-2 group-hover:ring-[#2563eb]/70"></span>

                {/* index */}
                <span className="absolute left-5 top-5 text-[11px] font-semibold tracking-[0.25em] text-white/45">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#60a5fa]">
                    Collection
                  </p>
                  <h3 className="mt-2 font-serif text-2xl sm:text-3xl font-bold leading-tight text-white drop-shadow-sm">
                    {category.name}
                  </h3>
                  <span className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                    Browse
                    <span aria-hidden="true" className="h-px w-6 bg-white/50 transition-all duration-300 group-hover:w-10 group-hover:bg-[#2563eb]"></span>
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
        <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl bg-[#1e40af] text-white ring-1 ring-[#2563eb]/20 shadow-[0_28px_70px_-34px_rgba(20,20,20,0.95)]">
          {/* ambient brand glows */}
          <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#2563eb]/25 blur-[110px]" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-1/4 h-80 w-80 rounded-full bg-[#93c5fd]/15 blur-[110px]" />

          <div className="relative px-6 sm:px-10 py-14 sm:py-16 text-center">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#60a5fa]">
              <span className="h-px w-6 bg-[#60a5fa]/60" />
              Need a hand?
              <span className="h-px w-6 bg-[#60a5fa]/60" />
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold">Can&apos;t find what you&apos;re looking for?</h2>
            <span aria-hidden="true" className="mt-4 mx-auto block h-1 w-16 rounded-full bg-gradient-to-r from-[#2563eb] to-[#93c5fd]" />
            <p className="mt-5 text-base sm:text-lg text-white/70 max-w-xl mx-auto leading-relaxed">
              Search the full catalogue or message our team on WhatsApp for personalised bale and stock recommendations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-8 py-3.5 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(37,99,235,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap"
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
