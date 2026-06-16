'use client';

import { useEffect } from 'react';

const SITE_NAME = "Wholesale Queen";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title
      ? `${title} | ${SITE_NAME}`
      : `${SITE_NAME} | China Wholesale — Shein Bales, Mannequins & Appliances`;
  }, [title]);
}
