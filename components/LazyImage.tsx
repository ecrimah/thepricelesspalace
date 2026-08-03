'use client';

import { useEffect, useState } from 'react';
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

const PLACEHOLDER = '/placeholder-product.webp';

/** Serve same-origin images directly — skip /_next/image (avoids sharp/cache blanks). */
function shouldBypassOptimizer(src: string) {
  try {
    const pathname = src.startsWith('http')
      ? new URL(src).pathname
      : src.split('?')[0];
    if (pathname.startsWith('/storage/') || pathname.startsWith('/uploads/')) {
      return true;
    }
    return (
      pathname.startsWith('/products/') ||
      pathname.startsWith('/hero-') ||
      pathname === PLACEHOLDER ||
      (pathname.startsWith('/') && /\.(webp|png|jpe?g|avif|gif)$/i.test(pathname))
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
  const [displaySrc, setDisplaySrc] = useState(src || PLACEHOLDER);
  const [failedPlaceholder, setFailedPlaceholder] = useState(false);

  useEffect(() => {
    setDisplaySrc(src || PLACEHOLDER);
    setFailedPlaceholder(false);
  }, [src]);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    if (displaySrc !== PLACEHOLDER) {
      setDisplaySrc(PLACEHOLDER);
      onLoad?.();
      return;
    }
    setFailedPlaceholder(true);
    onLoad?.();
  };

  if (!displaySrc || failedPlaceholder) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    );
  }

  const unoptimized = shouldBypassOptimizer(displaySrc);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <Image
        key={displaySrc}
        src={displaySrc}
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
