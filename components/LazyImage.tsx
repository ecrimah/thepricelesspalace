'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  sizes?: string;
}

/**
 * Bypass /_next/image only for disk-storage uploads (known sharp/cache blanks).
 * Static /public heroes & logos go through the optimizer for responsive srcset.
 */
function shouldBypassOptimizer(src: string) {
  try {
    const pathname = src.startsWith('http')
      ? new URL(src).pathname
      : src.split('?')[0];
    return pathname.startsWith('/storage/') || pathname.startsWith('/uploads/');
  } catch {
    return false;
  }
}

function EmptyImage({
  className,
  width,
  height,
}: {
  className: string;
  width?: number;
  height?: number;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <span className="text-gray-400 text-xs">No Image</span>
    </div>
  );
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
  const [displaySrc, setDisplaySrc] = useState(src || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDisplaySrc(src || '');
    setFailed(false);
  }, [src]);

  const handleLoad = () => {
    onLoad?.();
  };

  const handleError = () => {
    setFailed(true);
    onLoad?.();
  };

  if (!displaySrc || failed) {
    return <EmptyImage className={className} width={width} height={height} />;
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
        quality={unoptimized ? undefined : 65}
        unoptimized={unoptimized}
      />
    </div>
  );
}
