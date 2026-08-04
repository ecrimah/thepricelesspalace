'use client';

import { useState } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { useCart } from '@/context/CartContext';

const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#EF4444', blue: '#3B82F6',
  navy: '#1E3A5F', green: '#22C55E', yellow: '#EAB308', orange: '#F97316',
  pink: '#EC4899', purple: '#A855F7', brown: '#92400E', beige: '#D4C5A9',
  grey: '#6B7280', gray: '#6B7280', cream: '#FFFDD0', teal: '#14B8A6',
  maroon: '#800000', coral: '#FF7F50', burgundy: '#800020', olive: '#808000',
  tan: '#D2B48C', khaki: '#C3B091', charcoal: '#36454F', ivory: '#FFFFF0',
  gold: '#FFD700', silver: '#C0C0C0', rose: '#FF007F', lavender: '#E6E6FA',
  mint: '#98FB98', peach: '#FFDAB9', wine: '#722F37', denim: '#1560BD',
  nude: '#E3BC9A', camel: '#C19A6B', sage: '#BCB88A', rust: '#B7410E',
  mustard: '#FFDB58', plum: '#8E4585', lilac: '#C8A2C8', stone: '#928E85',
  sand: '#C2B280', taupe: '#483C32', mauve: '#E0B0FF', sky: '#87CEEB',
  forest: '#228B22', cobalt: '#0047AB', emerald: '#50C878', scarlet: '#FF2400',
  aqua: '#00FFFF', turquoise: '#40E0D0', indigo: '#4B0082', crimson: '#DC143C',
  magenta: '#FF00FF', cyan: '#00FFFF', chocolate: '#7B3F00', coffee: '#6F4E37',
};

export function getColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export interface ColorVariant {
  name: string;
  hex: string;
}

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  availability?: 'available' | 'preorder';
  preorderShipping?: string | null;
  inStock?: boolean;
  maxStock?: number;
  moq?: number;
  hasVariants?: boolean;
  minVariantPrice?: number;
  colorVariants?: ColorVariant[];
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  originalPrice,
  image,
  badge,
  availability = 'available',
  preorderShipping,
  inStock = true,
  maxStock = 50,
  moq = 1,
  hasVariants = false,
  minVariantPrice,
  colorVariants = []
}: ProductCardProps) {
  const { addToCart } = useCart();
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const displayPrice = hasVariants && minVariantPrice ? minVariantPrice : price;
  const discount = originalPrice ? Math.round((1 - displayPrice / originalPrice) * 100) : 0;
  const MAX_SWATCHES = 4;
  const isPreorder = availability === 'preorder';
  const availabilityLabel = isPreorder ? 'Pre-order' : 'Available';

  return (
    <article className="group h-full w-full overflow-hidden rounded-xl bg-white border border-[#1e40af]/[0.06] hover:border-[#2563eb]/40 hover:shadow-[0_10px_28px_-16px_rgba(20, 20, 20,0.45)] transition-all duration-300">
      <Link
        href={`/product/${slug}`}
        className="relative block aspect-square overflow-hidden bg-brand-carton/10"
      >
        <LazyImage
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        />

        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] shadow-sm ${
            isPreorder
              ? 'bg-amber-500 text-white'
              : 'bg-white/95 text-[#1e40af]'
          }`}
        >
          {availabilityLabel}
        </span>

        {badge && badge.toLowerCase() !== availabilityLabel.toLowerCase() && (
          <span className="absolute left-2 top-8 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#1e40af] shadow-sm">
            {badge}
          </span>
        )}

        {discount > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-gradient-to-br from-[#60a5fa] to-[#2563eb] px-2 py-0.5 text-[9px] font-bold text-[#1e40af] shadow-sm">
            -{discount}%
          </span>
        )}

        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <span className="rounded-full bg-[#1e40af] px-3 py-1.5 text-[11px] font-semibold text-white">
              Out of Stock
            </span>
          </div>
        )}

        {/* Floating quick-add — slides up on hover */}
        {inStock && (
          hasVariants ? (
            <span
              className="absolute bottom-2 right-2 inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/95 text-[#1e40af] shadow-md translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
              aria-hidden="true"
            >
              <i className="ri-arrow-right-line text-[13px] sm:text-[15px]" />
            </span>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart({ id, name, price, image, quantity: moq, slug, maxStock, moq });
              }}
              className="absolute bottom-2 right-2 inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#60a5fa] to-[#2563eb] text-[#1e40af] shadow-md translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 hover:brightness-105 transition-all duration-300"
              aria-label={moq > 1 ? `Add ${moq} to cart` : 'Add to cart'}
            >
              <i className="ri-shopping-bag-3-line text-[13px] sm:text-[14px]" />
            </button>
          )
        )}
      </Link>

      <div className="p-2 sm:p-2.5">
        <Link href={`/product/${slug}`}>
          <h3 className="text-[12px] sm:text-[13px] font-semibold text-gray-900 line-clamp-1 leading-snug group-hover:text-brand-brown transition-colors">
            {name}
          </h3>
        </Link>
        {isPreorder && preorderShipping && (
          <p className="mt-0.5 text-[10px] text-amber-700 line-clamp-1">
            Ships in {preorderShipping}
          </p>
        )}

        <div className="mt-1 sm:mt-1.5 flex items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
            <span className="text-[12px] sm:text-[13px] font-bold text-[#1e40af] truncate">
              {hasVariants && minVariantPrice ? `From ₵${minVariantPrice.toFixed(2)}` : `₵${price.toFixed(2)}`}
            </span>
            {originalPrice && (
              <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">₵{originalPrice.toFixed(2)}</span>
            )}
          </div>

          {colorVariants.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {colorVariants.slice(0, MAX_SWATCHES).map((color) => (
                <button
                  key={color.name}
                  title={color.name}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveColor(activeColor === color.name ? null : color.name);
                  }}
                  className={`h-3 w-3 flex-shrink-0 rounded-full border transition-all duration-200 ${
                    activeColor === color.name
                      ? 'scale-110 ring-2 ring-brand-carton ring-offset-1'
                      : 'hover:scale-110'
                  } ${color.hex === '#FFFFFF' ? 'border-gray-300' : 'border-transparent'}`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
              {colorVariants.length > MAX_SWATCHES && (
                <span className="text-[9px] text-gray-400">+{colorVariants.length - MAX_SWATCHES}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
