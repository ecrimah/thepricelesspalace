'use client';

import { useState, useEffect } from 'react';
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
  const [user, setUser] = useState<{ id?: string } | null>(null);

  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || 'The Priceless Palace';

  useEffect(() => {
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
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const active = (href: string) => {
    if (href === '/') return pathname === '/';
    const base = href.split('?')[0];
    return pathname.startsWith(base) && base !== '/';
  };

  return (
    <>
      <AnnouncementBar />

      <header className="sticky top-0 z-50 pwa-header bg-white border-b border-gray-200/80 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="safe-area-top" />
        <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px] sm:h-[72px]">

            {/* Left — mobile menu + logo */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 lg:min-w-[200px]">
              <button
                className="lg:hidden w-9 h-9 flex items-center justify-center text-[#1e40af]/70 hover:text-[#1e40af]"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <i className="ri-menu-3-line text-[22px]" />
              </button>

              <Link href="/" className="flex items-center shrink-0 group" aria-label="Go to homepage">
                <img
                  src="/logo.png"
                  alt={siteName}
                  className="h-10 sm:h-11 w-auto object-contain"
                />
              </Link>
            </div>

            {/* Center — desktop nav */}
            <div className="hidden lg:flex items-center justify-center flex-1 gap-6 xl:gap-8 px-4">
              {navLinks.map((link) => {
                const isActive = active(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-[14px] font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-[#1e40af]'
                        : 'text-[#1e40af]/65 hover:text-[#1e40af]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right — utility icons */}
            <div className="flex items-center gap-1 sm:gap-2 lg:min-w-[200px] lg:justify-end">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-[#1e40af]/70 hover:text-[#1e40af] transition-colors"
                aria-label="Search"
              >
                <i className="ri-search-line text-[21px]" />
              </button>

              <Link
                href="/wishlist"
                className="relative w-10 h-10 flex items-center justify-center text-[#1e40af]/70 hover:text-[#1e40af] transition-colors"
                aria-label={`Wishlist, ${wishlistCount} items`}
              >
                <i className="ri-heart-line text-[21px]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#2563eb] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <div className="relative">
                <button
                  className="relative w-10 h-10 flex items-center justify-center text-[#1e40af]/70 hover:text-[#1e40af] transition-colors"
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  aria-label={`Shopping cart, ${cartCount} items`}
                  aria-expanded={isCartOpen}
                  aria-controls="mini-cart"
                >
                  <i className="ri-shopping-bag-line text-[21px]" />
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#2563eb] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
                <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              </div>

              <Link
                href={user ? '/account' : '/auth/login'}
                className="w-10 h-10 flex items-center justify-center text-[#1e40af]/70 hover:text-[#1e40af] transition-colors"
                aria-label={user ? 'My account' : 'Login'}
              >
                <i className={`${user ? 'ri-user-smile-line' : 'ri-user-line'} text-[21px]`} />
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
                  <i className="ri-search-line text-[#1e40af]/25 text-xl shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dresses, bags, wigs…"
                    className="flex-1 py-5 text-[16px] text-[#1e40af] bg-transparent outline-none placeholder-[#1e40af]/25"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="shrink-0 text-[11px] font-semibold text-[#1e40af]/30 bg-[#1e40af]/5 px-2.5 py-1 rounded-md hover:bg-[#1e40af]/10 transition-colors"
                  >
                    ESC
                  </button>
                </div>
                <div className="border-t border-[#1e40af]/5 px-5 py-3 flex flex-wrap gap-2">
                  {['Dresses', 'Bags', 'Slippers', 'Wigs'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setSearchQuery(tag); }}
                      className="text-[11px] font-medium text-[#1e40af]/40 bg-[#1e40af]/[0.03] hover:bg-[#2563eb]/10 hover:text-[#2563eb] px-3 py-1.5 rounded-full transition-colors"
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

          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[360px] bg-white flex flex-col animate-in slide-in-from-left duration-300 shadow-2xl">
            <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-gray-100">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center">
                <img src="/logo.png" alt={siteName} className="h-9 w-auto object-contain" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center text-[#1e40af]/40 hover:text-[#1e40af]"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3.5 rounded-xl text-[15px] font-medium transition-colors ${
                    active(link.href)
                      ? 'bg-[#1e40af] text-white'
                      : 'text-[#1e40af]/70 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                <Link
                  href={user ? '/account' : '/auth/login'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-3 text-[14px] text-[#1e40af]/60 hover:text-[#1e40af]"
                >
                  {user ? 'My Account' : 'Sign In'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
