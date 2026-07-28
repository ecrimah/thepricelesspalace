'use client';

import { usePageTitle } from '@/hooks/usePageTitle';
import { BRAND } from '@/lib/brand';

export default function PrivacyPage() {
  usePageTitle('Privacy Policy');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <article className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight mb-6">Privacy Policy</h1>
        <p className="text-slate-600 leading-relaxed mb-4">
          Placeholder privacy policy for {BRAND.name}. Document how you collect, use,
          and protect personal data before launch.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Contact: {BRAND.email}
        </p>
      </article>
    </div>
  );
}
