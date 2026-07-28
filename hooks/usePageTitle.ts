'use client';

import { useEffect } from 'react';
import { BRAND } from '@/lib/brand';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${BRAND.name}`
      : `${BRAND.name} | ${BRAND.tagline}`;
  }, [title]);
}
