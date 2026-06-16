'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MiniCart from './MiniCart';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import AnnouncementBar from './AnnouncementBar';

export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || 'Wholesale Queen';

  // Sliding active-indicator for the desktop nav (dimensional layering)
  const navRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const container = navRef.current;
      if (!container) return;
      const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!activeEl) {
        setIndicator((p) => ({ ...p, opacity: 0 }));
        return;
      }
      setIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1,
      });
    };
    measure();
    const id = window.setTimeout(measure, 60); // settle after font/layout shifts
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('resize', measure);
    };
  }, [pathname, isScrolled]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const updateWishlistCount = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setWishlistCount(wishlist.length);
    };
    updateWishlistCount();
    window.addEventListener('wishlistUpdated', updateWishlistCount);

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wishlistUpdated', updateWishlistCount);
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: 'Categories', href: '/categories' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <AnnouncementBar />

      <header
        className={`sticky top-0 z-50 pwa-header bg-white transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${
          isScrolled
            ? 'shadow-[0_10px_30px_-16px_rgba(20, 20, 20,0.4)] border-b border-[#C9A24E]/25'
            : 'border-b border-[#C9A24E]/15'
        }`}
      >
        <div className="safe-area-top" />
        <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between gap-3 transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${isScrolled ? 'h-[62px]' : 'h-[70px] sm:h-[84px]'}`}>

            {/* Left — logo + nav */}
            <div className="flex items-center gap-2 lg:gap-7 min-w-0">
              <button
                className="lg:hidden -ml-1 w-10 h-10 flex items-center justify-center rounded-full text-[#141414]/70 hover:text-[#141414] hover:bg-[#141414]/[0.06] transition-colors"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <i className="ri-menu-3-line text-[22px]"></i>
              </button>

              <Link href="/" className="group flex items-center shrink-0" aria-label="Go to homepage">
                <span className="relative flex items-center">
                  <span className="absolute -inset-2 rounded-full bg-[#D8B85F]/25 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src="/wholesalequeen-logo.png"
                    alt={siteName}
                    className={`relative w-auto object-contain transition-all duration-500 ${isScrolled ? 'h-8 sm:h-9' : 'h-9 sm:h-11'}`}
                  />
                </span>
              </Link>

              <div ref={navRef} className="relative hidden lg:flex items-center gap-1 self-stretch">
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 h-[2px] rounded-full bg-gradient-to-r from-[#D8B85F] to-[#C9A24E] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
                />
                {navLinks.map((link) => {
                  const isActive = active(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      data-active={isActive}
                      className={`relative flex items-center px-3.5 text-[13.5px] font-medium tracking-[0.01em] transition-colors duration-300 ${
                        isActive ? 'text-[#141414]' : 'text-[#141414]/55 hover:text-[#141414]'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right — search pill + divider + icons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Rounded search pill (desktop) */}
              <form onSubmit={handleSearch} className="hidden lg:flex items-center group">
                <div className="flex items-center gap-2 rounded-full bg-[#141414]/[0.04] border border-[#C9A24E]/30 pl-4 pr-1.5 py-1.5 shadow-[inset_0_1px_2px_rgba(20, 20, 20,0.04)] transition-all duration-300 focus-within:bg-white focus-within:border-[#C9A24E]/60 focus-within:shadow-[0_4px_14px_-8px_rgba(20, 20, 20,0.4)] w-[210px] xl:w-[260px] focus-within:w-[240px] xl:focus-within:w-[300px]">
                  <i className="ri-search-2-line text-[15px] text-[#141414]/40 group-focus-within:text-[#C9A24E]"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for products…"
                    className="flex-1 min-w-0 bg-transparent text-[13px] text-[#141414] placeholder:text-[#141414]/40 outline-none"
                    aria-label="Search products"
                  />
                  <button
                    type="submit"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-[#D8B85F] to-[#C9A24E] text-[#141414] hover:brightness-105 transition"
                    aria-label="Submit search"
                  >
                    <i className="ri-arrow-right-line text-[14px]"></i>
                  </button>
                </div>
              </form>

              {/* Search icon (mobile/tablet) */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/[0.06] transition-colors"
                aria-label="Search"
              >
                <i className="ri-search-2-line text-[20px]"></i>
              </button>

              {/* Divider */}
              <span aria-hidden="true" className="hidden lg:block h-6 w-px bg-[#141414]/15" />

              <Link
                href="/wishlist"
                className="relative w-10 h-10 hidden sm:flex items-center justify-center rounded-full text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/[0.06] transition-colors"
                aria-label={`Wishlist, ${wishlistCount} items`}
              >
                <i className="ri-heart-3-line text-[20px]"></i>
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-gradient-to-br from-[#D8B85F] to-[#C9A24E] text-[#141414] text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  className="relative w-10 h-10 flex items-center justify-center rounded-full text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/[0.06] transition-colors"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  aria-label={`Shopping cart, ${cartCount} items`}
                  aria-expanded={isCartOpen}
                  aria-controls="mini-cart"
                >
                  <i className="ri-shopping-bag-3-line text-[20px]"></i>
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 bg-gradient-to-br from-[#D8B85F] to-[#C9A24E] text-[#141414] text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {cartCount}
                    </span>
                  )}
                </button>
                <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              </div>

              <Link
                href={user ? '/account' : '/auth/login'}
                className="hidden lg:flex w-10 h-10 items-center justify-center rounded-full text-[#141414]/60 hover:text-[#141414] hover:bg-[#141414]/[0.06] transition-colors"
                aria-label={user ? 'My account' : 'Login'}
              >
                <i className={`${user ? 'ri-user-smile-line' : 'ri-user-4-line'} text-[20px]`}></i>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Search overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={() => setIsSearchOpen(false)} />
          <div className="relative max-w-2xl mx-auto mt-[15vh] px-5 animate-in fade-in slide-in-from-top-6 duration-300">
            <form onSubmit={handleSearch} className="relative">
              <div className="bg-white rounded-[20px] shadow-2xl overflow-hidden">
                <div className="flex items-center px-5 gap-3">
                  <i className="ri-search-2-line text-[#141414]/25 text-xl shrink-0"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What are you looking for?"
                    className="flex-1 py-5 text-[16px] text-[#141414] bg-transparent outline-none placeholder-[#141414]/25"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="shrink-0 text-[11px] font-semibold text-[#141414]/30 bg-[#141414]/5 px-2.5 py-1 rounded-md hover:bg-[#141414]/10 hover:text-[#141414]/50 transition-colors"
                  >
                    ESC
                  </button>
                </div>
                <div className="border-t border-[#141414]/5 px-5 py-3 flex flex-wrap gap-2">
                  {['New Arrivals', 'Best Sellers', 'Home & Kitchen'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setSearchQuery(tag); }}
                      className="text-[11px] font-medium text-[#141414]/40 bg-[#141414]/[0.03] hover:bg-[#C9A24E]/10 hover:text-[#C9A24E] px-3 py-1.5 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Full-height panel */}
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[360px] bg-[#FAFAF8] flex flex-col animate-in slide-in-from-left duration-400 shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 h-16 shrink-0">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                <img src="/wholesalequeen-logo.png" alt={siteName} className="h-8 w-auto object-contain" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center text-[#141414]/30 hover:text-[#141414] rounded-full hover:bg-[#141414]/5 transition-colors"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">

              {/* Main nav */}
              <div className="space-y-1 mb-6">
                {[{ label: 'Home', href: '/', icon: 'ri-home-5-line' }, ...navLinks.map(l => ({
                  ...l,
                  icon: l.href === '/shop' ? 'ri-store-2-line' : l.href === '/categories' ? 'ri-layout-grid-line' : l.href === '/about' ? 'ri-information-line' : 'ri-mail-send-line',
                }))].map((link, i) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-medium transition-all animate-in slide-in-from-left-3 fade-in duration-300 fill-mode-both ${
                      active(link.href)
                        ? 'bg-[#141414] text-white shadow-md shadow-[#141414]/20'
                        : 'text-[#141414]/70 hover:bg-white hover:text-[#141414] hover:shadow-sm'
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <i className={`${link.icon} text-lg ${active(link.href) ? 'text-[#C9A24E]' : 'text-[#141414]/30'}`}></i>
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-[#141414]/[0.06] mx-2 mb-5" />

              {/* Quick actions */}
              <p className="px-4 mb-2.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[#141414]/25">Quick Links</p>
              <div className="space-y-0.5 mb-6">
                {[
                  { label: 'Track Order', href: '/order-tracking', icon: 'ri-truck-line' },
                  { label: 'Wishlist', href: '/wishlist', icon: 'ri-heart-3-line', badge: wishlistCount },
                  { label: user ? 'My Account' : 'Sign In', href: user ? '/account' : '/auth/login', icon: user ? 'ri-user-smile-line' : 'ri-user-4-line' },
                  { label: 'Help Center', href: '/faqs', icon: 'ri-question-line' },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] text-[#141414]/50 hover:text-[#141414] hover:bg-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <i className={`${link.icon} text-[17px] text-[#141414]/25`}></i>
                    <span className="flex-1">{link.label}</span>
                    {'badge' in link && link.badge! > 0 && (
                      <span className="text-[10px] font-bold text-[#C9A24E] bg-[#C9A24E]/10 w-5 h-5 rounded-full flex items-center justify-center">{link.badge}</span>
                    )}
                  </Link>
                ))}
              </div>

              {/* Install CTA */}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-pwa-install-guide'));
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[#C9A24E]/10 to-[#C9A24E]/5 text-[14px] font-semibold text-[#C9A24E] hover:from-[#C9A24E]/15 hover:to-[#C9A24E]/10 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-[#C9A24E]/15 flex items-center justify-center">
                  <i className="ri-smartphone-line text-base text-[#C9A24E]"></i>
                </div>
                Install the App
              </button>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-4 border-t border-[#141414]/[0.04] bg-[#FAFAF8]">
              <p className="text-[10px] text-[#141414]/20 font-medium">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
