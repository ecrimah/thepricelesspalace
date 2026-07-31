'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePageTitle } from '@/hooks/usePageTitle';
import ProductCard, { type ColorVariant } from '@/components/ProductCard';
import { getColorHex } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/query-cache';
import PageHero from '@/components/PageHero';

function ShopContent() {
  usePageTitle('Shop Products');
  const searchParams = useSearchParams();

  // State
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([{ id: 'all', name: 'All Products', count: 0 }]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [sortBy, setSortBy] = useState('popular');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const productsPerPage = 9;

  // Initialize from URL params
  useEffect(() => {
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');
    const search = searchParams.get('search');

    if (category) setSelectedCategory(category);
    if (sort) setSortBy(sort);
  }, [searchParams]);

  // Fetch Categories from cached API
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/storefront/categories');
        if (res.ok) {
          const data = await res.json();
          if (data) setCategories(data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Fetch Products
  useEffect(() => {
    async function fetchProducts() {
      const isFirstPage = page === 1;
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      try {
        const search = searchParams.get('search');

        const cacheKey = `shop:${selectedCategory}:${search}:${priceRange.join('-')}:${selectedRating}:${sortBy}:${page}`;
        const { data, count, error } = await cachedQuery<{ data: any; count: any; error: any }>(
          cacheKey,
          async () => {
            let query = supabase
              .from('products')
              .select(`
                *,
                categories(name, slug),
                product_images(url, position),
                product_variants(id, name, price, quantity, option1, option2, image_url)
              `, { count: 'exact' })
              .eq('status', 'active');
            // product_images are already ordered by position in the PG embed resolver.
            // Do NOT .order('position', { foreignTable }) — the HTTP client treats that
            // as products.position, which does not exist and empties the shop.

            if (search) {
              query = query.ilike('name', `%${search}%`);
            }

            if (selectedCategory !== 'all') {
              const categoryObj = categories.find(c => c.slug === selectedCategory);

              if (categoryObj) {
                const targetSlugs = [selectedCategory];
                const childSlugs = categories
                  .filter(c => c.parent_id === categoryObj.id)
                  .map(c => c.slug);
                targetSlugs.push(...childSlugs);
                query = query.in('categories.slug', targetSlugs);
              } else {
                query = query.eq('categories.slug', selectedCategory);
              }
            }

            if (priceRange[1] < 5000) {
              query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
            }

            if (selectedRating > 0) {
              query = query.gte('rating_avg', selectedRating);
            }

            switch (sortBy) {
              case 'price-low':
                query = query.order('price', { ascending: true });
                break;
              case 'price-high':
                query = query.order('price', { ascending: false });
                break;
              case 'rating':
                query = query.order('rating_avg', { ascending: false });
                break;
              case 'new':
                query = query.order('created_at', { ascending: false });
                break;
              case 'popular':
              default:
                query = query.order('created_at', { ascending: false });
                break;
            }

            const from = (page - 1) * productsPerPage;
            const to = from + productsPerPage - 1;
            query = query.range(from, to);

            return query as any;
          },
          2 * 60 * 1000
        );

        if (error) throw error;

        if (data) {
          const formattedProducts = data.map((p: any) => {
            const variants = p.product_variants || [];
            const hasVariants = variants.length > 0;
            const minVariantPrice = hasVariants ? Math.min(...variants.map((v: any) => v.price || p.price)) : undefined;
            const totalVariantStock = hasVariants ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) : 0;
            const effectiveStock = hasVariants ? totalVariantStock : p.quantity;
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
            const isPreorder =
              p.metadata?.availability === 'preorder' ||
              (!!p.metadata?.preorder_shipping && p.metadata?.availability !== 'available');
            return {
              id: p.id,           // Product UUID for cart/orders
              slug: p.slug,       // Slug for navigation
              name: p.name,
              price: p.price,
              originalPrice: p.compare_at_price,
              image: p.product_images?.[0]?.url || '/placeholder-product.webp',
              rating: p.rating_avg || 0,
              reviewCount: 0, // Need to implement reviews relation
              badge: p.compare_at_price > p.price ? 'Sale' : undefined,
              availability: isPreorder ? 'preorder' as const : 'available' as const,
              preorderShipping: p.metadata?.preorder_shipping || null,
              inStock: effectiveStock > 0,
              maxStock: effectiveStock || 50,
              moq: p.moq || 1,
              category: p.categories?.name,
              hasVariants,
              minVariantPrice,
              colorVariants,
            };
          });
          setProducts(prev => {
            if (isFirstPage) return formattedProducts;
            // Append while de-duping by id (guards against overlapping refetches)
            const seen = new Set(prev.map((p: any) => p.id));
            return [...prev, ...formattedProducts.filter((p: any) => !seen.has(p.id))];
          });
          setTotalProducts(count || 0);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    }

    fetchProducts();
  }, [selectedCategory, priceRange, selectedRating, sortBy, page, searchParams, categories]);

  // Reset to first page whenever the filters/search change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, priceRange, selectedRating, sortBy, searchParams]);

  const hasMore = products.length < totalProducts;

  // Infinite scroll — load the next page when the sentinel scrolls into view
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);

  return (
    <main className="min-h-screen bg-white">
      <PageHero
        title="Browse Our Collections"
        subtitle="Explore carefully curated products sourced from trusted global suppliers — quality you can count on, delivered to your doorstep."
        image="/hero-shop.webp"
      />

      {/* Mobile Filter Toggle */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-brand-carton/20 py-4 px-4 sticky top-[72px] z-20">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="inline-flex items-center space-x-2 text-brand-brown font-semibold"
          >
            <i className="ri-filter-3-line text-xl"></i>
            <span>Filters & Sort</span>
          </button>
          <span className="text-sm text-brand-brown">{totalProducts} Products</span>
        </div>
      </div>

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-8">
            <aside className={`${isFilterOpen ? 'fixed inset-0 z-50 bg-white overflow-y-auto' : 'hidden'} lg:block lg:w-72 lg:flex-shrink-0`}>
              <div className="lg:sticky lg:top-24">
                <div className="bg-white lg:bg-brand-cream/55 lg:border lg:border-brand-carton/20 lg:rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-6 lg:hidden">
                    <h2 className="text-xl font-bold text-brand-brown">Filters</h2>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-10 h-10 flex items-center justify-center text-brand-brown"
                    >
                      <i className="ri-close-line text-2xl"></i>
                    </button>
                  </div>

                  <div className="space-y-8">
                    {/* Categories */}
                    <div>
                      <h3 className="font-semibold text-brand-brown mb-4">Categories</h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setSelectedCategory('all');
                            setPage(1);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedCategory === 'all'
                            ? 'bg-brand-cream text-brand-brown font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                          All Products
                        </button>

                        {/* Parent Categories */}
                        {categories.filter(c => !c.parent_id && c.id !== 'all').map(parent => {
                          const subcategories = categories.filter(c => c.parent_id === parent.id);
                          const isSelected = selectedCategory === parent.slug;
                          const isChildSelected = subcategories.some(sub => sub.slug === selectedCategory);
                          const isOpen = isSelected || isChildSelected; // Auto-expand if selected

                          return (
                            <div key={parent.id} className="space-y-1">
                              <button
                                onClick={() => {
                                  setSelectedCategory(parent.slug);
                                  setPage(1);
                                }}
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex justify-between items-center ${isSelected
                                  ? 'bg-brand-cream text-brand-brown font-medium'
                                  : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                              >
                                <span>{parent.name}</span>
                              </button>

                              {/* Subcategories */}
                              {subcategories.length > 0 && (
                                <div className="ml-4 border-l-2 border-gray-100 pl-2 space-y-1">
                                  {subcategories.map(child => (
                                    <button
                                      key={child.id}
                                      onClick={() => {
                                        setSelectedCategory(child.slug);
                                        setPage(1);
                                        setIsFilterOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-1.5 rounded-lg text-sm transition-colors ${selectedCategory === child.slug
                                        ? 'text-brand-brown font-medium bg-brand-cream'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                    >
                                      {child.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="border-t border-brand-carton/20 pt-8">
                      <h3 className="font-semibold text-brand-brown mb-4">Max Price: ₵{priceRange[1]}</h3>
                      <div className="space-y-4">
                        <input
                          type="range"
                          min="0"
                          max="5000"
                          step="50"
                          value={priceRange[1]}
                          onChange={(e) => {
                            setPriceRange([0, parseInt(e.target.value)]);
                            setPage(1);
                          }}
                          className="w-full h-2 bg-brand-cream rounded-lg appearance-none cursor-pointer accent-brand-brown"
                        />
                        <div className="flex items-center justify-between text-sm text-brand-brown/80">
                          <span>₵0</span>
                          <span>₵5000+</span>
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="border-t border-brand-carton/20 pt-8">
                      <h3 className="font-semibold text-brand-brown mb-4">Rating</h3>
                      <div className="space-y-2">
                        {[4, 3, 2, 1].map(rating => (
                          <button
                            key={rating}
                            onClick={() => {
                              setSelectedRating(rating === selectedRating ? 0 : rating);
                              setPage(1);
                            }}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${selectedRating === rating
                              ? 'bg-brand-cream text-brand-brown'
                              : 'text-gray-700 hover:bg-gray-100'
                              }`}
                          >
                            <div className="flex items-center space-x-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <i
                                  key={star}
                                  className={`${star <= rating ? 'ri-star-fill text-brand-gold' : 'ri-star-line text-gray-300'} text-sm`}
                                ></i>
                              ))}
                              <span className="text-sm">& Up</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsFilterOpen(false);
                      }}
                      className="w-full bg-brand-carton hover:bg-brand-brown text-white py-3 rounded-xl font-semibold transition-colors whitespace-nowrap"
                    >
                      Show Results
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="mb-8 rounded-2xl border border-brand-carton/20 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-brand-brown text-xs font-semibold tracking-[0.2em] uppercase">Collection View</p>
                    <p className="mt-1 text-gray-700">
                      Showing <span className="font-bold text-brand-brown">{products.length}</span> of <span className="font-bold text-brand-brown">{totalProducts}</span> products
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value);
                        setPage(1);
                      }}
                      className="px-4 py-2 pr-8 border border-brand-carton/30 rounded-xl focus:ring-2 focus:ring-brand-carton focus:border-brand-carton text-sm bg-white cursor-pointer"
                    >
                      <option value="popular">Most Popular</option>
                      <option value="new">Newest</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-brand-carton/20 bg-white p-2 sm:p-3">
                      <div className="bg-brand-cream rounded-xl aspect-[4/5] animate-pulse"></div>
                      <div className="mt-3 h-4 w-3/4 rounded bg-brand-carton/20 animate-pulse"></div>
                      <div className="mt-2 h-4 w-1/2 rounded bg-brand-carton/20 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6" data-product-shop>
                    {products.map(product => (
                      <ProductCard key={product.id} {...product} />
                    ))}
                  </div>

                  {products.length === 0 && (
                    <div className="text-center py-20 px-6 mt-4 rounded-3xl border border-brand-carton/20 bg-brand-cream/40">
                      <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6 bg-white rounded-full border border-brand-carton/20 shadow-sm">
                        <i className="ri-inbox-line text-4xl text-brand-carton"></i>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-brown mb-2">No Products Found</h3>
                      <p className="text-brand-brown/80 mb-8">Try adjusting your filters to discover more fashion pieces</p>
                      <button
                        onClick={() => {
                          setSelectedCategory('all');
                          setPriceRange([0, 5000]);
                          setSelectedRating(0);
                          setPage(1);
                        }}
                        className="inline-flex items-center bg-brand-carton hover:bg-brand-brown text-white px-6 py-3 rounded-xl font-semibold transition-colors whitespace-nowrap"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Infinite scroll sentinel + states */}
              {!loading && products.length > 0 && (
                <>
                  <div ref={loadMoreRef} aria-hidden="true" className="h-px w-full" />

                  {loadingMore && (
                    <div className="mt-10 grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="rounded-2xl border border-brand-carton/20 bg-white p-2 sm:p-3">
                          <div className="bg-brand-cream rounded-xl aspect-[4/5] animate-pulse"></div>
                          <div className="mt-3 h-4 w-3/4 rounded bg-brand-carton/20 animate-pulse"></div>
                          <div className="mt-2 h-4 w-1/2 rounded bg-brand-carton/20 animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasMore && (
                    <div className="mt-12 flex flex-col items-center gap-3 text-center">
                      <span className="h-px w-16 bg-brand-carton/40" />
                      <p className="text-sm font-medium text-brand-brown/70">
                        You&apos;ve reached the end — {totalProducts} {totalProducts === 1 ? 'product' : 'products'} in this view
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div></div>}>
      <ShopContent />
    </Suspense>
  );
}