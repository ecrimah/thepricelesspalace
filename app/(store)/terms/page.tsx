'use client';

import { usePageTitle } from '@/hooks/usePageTitle';
import { BRAND } from '@/lib/brand';

export default function TermsPage() {
  usePageTitle('Terms of Service');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <article className="max-w-3xl mx-auto px-6 py-16 sm:py-24 prose prose-slate">
        <h1 className="text-4xl font-extrabold tracking-tight mb-6">Terms of Service</h1>
        <p className="text-slate-600 leading-relaxed mb-4">
          Placeholder terms for {BRAND.name}. Replace this page with legal terms
          reviewed by counsel before going live.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Contact: {BRAND.email}
        </p>
      </article>
    </div>
  );
}
