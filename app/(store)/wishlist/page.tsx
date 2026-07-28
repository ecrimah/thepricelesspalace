'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import PageHero from '@/components/PageHero';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function WishlistPage() {
  usePageTitle('Wishlist');
  const { wishlist: wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const addAllToCart = () => {
    const inStockItems = wishlistItems.filter(item => item.inStock);
    inStockItems.forEach(item => {
      // Convert WishlistItem to CartItem if necessary, or assume compatibility
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        slug: item.slug || item.id, // Fallback
        maxStock: 99 // Default
      });
    });
    if (inStockItems.length > 0) {
      alert(`Added ${inStockItems.length} items to cart`);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <PageHero title="My Wishlist" image="/hero-wishlist.png" />

      {/* Toolbar */}
      <section className="bg-white border-b border-[#1e40af]/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <nav className="flex items-center space-x-2 text-sm mb-4">
            <Link href="/" className="text-[#1e40af]/55 hover:text-[#2563eb] transition-colors">Home</Link>
            <i className="ri-arrow-right-s-line text-[#1e40af]/30"></i>
            <span className="text-[#1e40af] font-medium">Wishlist</span>
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_12px_26px_-12px_rgba(37,99,235,0.95)]">
                <i className="ri-heart-3-fill text-xl"></i>
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#1e40af] leading-none">Saved items</h2>
                <p className="mt-1 text-sm text-[#1e40af]/55">
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
                </p>
              </div>
            </div>
            {wishlistItems.length > 0 && (
              <button
                onClick={addAllToCart}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-6 py-3 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(37,99,235,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap"
              >
                <i className="ri-shopping-bag-3-line"></i>
                Add All to Cart
              </button>
            )}
          </div>
        </div>
      </section>

      {wishlistItems.length === 0 ? (
        <section className="py-20">
          <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
            <div className="relative w-28 h-28 flex items-center justify-center mx-auto mb-7">
              <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[#2563eb]/15 blur-xl" />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.95)]">
                <i className="ri-heart-3-line text-5xl"></i>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1e40af] mb-3">Your wishlist is empty</h2>
            <p className="text-[#1e40af]/60 mb-8">Tap the heart on any product to save it here and find it again in a tap.</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-8 py-3.5 text-sm font-semibold shadow-[0_14px_30px_-12px_rgba(37,99,235,0.9)] hover:brightness-105 hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              Explore Products
              <i className="ri-arrow-right-up-line"></i>
            </Link>
          </div>
        </section>
      ) : (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistItems.map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard {...product} slug={product.slug || product.id} />
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    aria-label="Remove from wishlist"
                    className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/95 backdrop-blur rounded-full shadow-[0_6px_16px_-6px_rgba(20,20,20,0.45)] ring-1 ring-[#1e40af]/[0.06] text-[#1e40af]/60 hover:text-white hover:bg-[#93c5fd] hover:ring-[#93c5fd] transition-colors z-10"
                  >
                    <i className="ri-close-line text-lg"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Share — immersive black */}
      <section className="pb-16 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-[#1e40af] text-white p-10 sm:p-12 text-center ring-1 ring-[#2563eb]/20 shadow-[0_28px_70px_-34px_rgba(20,20,20,0.95)]">
            <span aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-[100px]" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#93c5fd]/15 blur-[100px]" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.25em] uppercase text-[#60a5fa]">
                <span className="h-px w-6 bg-[#60a5fa]/60" />
                Spread the love
                <span className="h-px w-6 bg-[#60a5fa]/60" />
              </span>
              <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold">Share your wishlist</h2>
              <p className="mt-3 text-white/65 max-w-md mx-auto">Let friends and family know exactly what you love.</p>
              <div className="mt-7 flex justify-center gap-3">
                {[
                  { icon: 'ri-whatsapp-fill', label: 'WhatsApp' },
                  { icon: 'ri-facebook-fill', label: 'Facebook' },
                  { icon: 'ri-twitter-x-fill', label: 'X' },
                  { icon: 'ri-mail-fill', label: 'Email' },
                ].map((s) => (
                  <button
                    key={s.label}
                    aria-label={`Share on ${s.label}`}
                    className="w-12 h-12 flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 hover:text-white hover:bg-[#2563eb] hover:border-[#2563eb] transition-colors"
                  >
                    <i className={`${s.icon} text-xl`}></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
