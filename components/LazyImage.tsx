'use client';

import { useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  sizes?: string;
}

/** Static public assets are already WebP — skip the optimizer for faster first paint. */
function isStaticPublicAsset(src: string) {
  try {
    const pathname = src.startsWith('http')
      ? new URL(src).pathname
      : src.split('?')[0];
    if (pathname.startsWith('/storage/') || pathname.startsWith('/uploads/')) {
      return false;
    }
    return (
      pathname.startsWith('/products/') ||
      pathname.startsWith('/hero-') ||
      pathname === '/placeholder-product.webp' ||
      (pathname.startsWith('/') && /\.(webp|png|jpe?g|avif)$/i.test(pathname))
    );
  } catch {
    return false;
  }
}

export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
}: LazyImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onLoad?.();
  };

  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    );
  }

  const unoptimized = isStaticPublicAsset(src);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        quality={unoptimized ? undefined : 70}
        unoptimized={unoptimized}
      />
    </div>
  );
}
