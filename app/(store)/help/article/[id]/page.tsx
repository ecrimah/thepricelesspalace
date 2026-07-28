'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { sanitizeHtml } from '@/lib/sanitize';

const articles: Record<string, { title: string; category: string; content: string }> = {
  '1': {
    title: 'How do I track my order?',
    category: 'Orders & Delivery',
    content: `
      <p>This is placeholder help content.</p>
      <p>Go to the <a href="/order-tracking">Order Tracking</a> page and enter your order number and email.</p>
    `,
  },
  '6': {
    title: 'How do I return an item?',
    category: 'Returns & Refunds',
    content: `
      <p>This is placeholder help content.</p>
      <p>Start a return from the <a href="/returns">Returns Portal</a> or contact support for assistance.</p>
    `,
  },
};

export default function ArticlePage() {
  const params = useParams();
  const articleId = params.id as string;
  const article = articles[articleId] || articles['1'];
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/help" className="inline-flex items-center text-gray-900 font-semibold mb-6">
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Help Center
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-sm font-semibold">
              {article.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-6">{article.title}</h1>
            <article
              className="prose prose-gray max-w-none text-gray-600"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Was this article helpful?</h3>
            {wasHelpful === null ? (
              <div className="flex space-x-4">
                <button
                  onClick={() => setWasHelpful(true)}
                  className="flex-1 py-3 px-6 border-2 border-gray-900 text-gray-900 rounded-lg font-semibold"
                >
                  Yes
                </button>
                <button
                  onClick={() => setWasHelpful(false)}
                  className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold"
                >
                  No
                </button>
              </div>
            ) : (
              <p className="text-gray-600">Thank you for your feedback.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
