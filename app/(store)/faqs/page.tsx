'use client';

import { usePageTitle } from '@/hooks/usePageTitle';

const faqs = [
  {
    q: 'What is this project?',
    a: 'This repository is a cleaned e-commerce foundation prepared for a new product. Branding and business content should be added next.',
  },
  {
    q: 'How do I add products?',
    a: 'Sign in to the admin panel and use the Products module. No sample catalog is included by default.',
  },
  {
    q: 'Are payment integrations active?',
    a: 'Payment gateway code is preserved but disabled until you provide valid environment credentials.',
  },
];

export default function FaqsPage() {
  usePageTitle('FAQs');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">FAQs</h1>
        <p className="text-slate-600 mb-10">
          Starter questions only. Replace this list with your real customer FAQs.
        </p>
        <div className="space-y-8">
          {faqs.map((item) => (
            <div key={item.q}>
              <h2 className="text-lg font-semibold mb-2">{item.q}</h2>
              <p className="text-slate-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
