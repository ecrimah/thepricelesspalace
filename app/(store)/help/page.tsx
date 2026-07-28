'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const categories = [
  {
    id: 'orders',
    title: 'Orders & Delivery',
    icon: 'ri-shopping-bag-line',
    count: 2,
    articles: [
      { id: 1, title: 'How do I track my order?', views: 0 },
      { id: 2, title: 'What are the delivery times?', views: 0 },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    icon: 'ri-arrow-left-right-line',
    count: 2,
    articles: [
      { id: 6, title: 'How do I return an item?', views: 0 },
      { id: 7, title: 'What is your return policy?', views: 0 },
    ],
  },
];

const popularArticles = [
  { id: 1, title: 'How do I track my order?', category: 'Orders' },
  { id: 6, title: 'How do I return an item?', category: 'Returns' },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = selectedCategory
    ? categories.filter((cat) => cat.id === selectedCategory)
    : categories;

  const filteredArticles = searchQuery
    ? categories.flatMap((cat) =>
        cat.articles
          .filter((article) => article.title.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((article) => ({ ...article, category: cat.title }))
      )
    : [];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-gray-900 to-gray-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-gray-100 mb-8 text-lg">Starter placeholder articles. Replace with your support content.</p>

            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for articles..."
                className="w-full px-6 py-4 pl-14 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-4 focus:ring-gray-300"
              />
              <i className="ri-search-line absolute left-5 top-1/2 -translate-y-1/2 text-2xl text-gray-400"></i>
            </div>

            {searchQuery && filteredArticles.length > 0 && (
              <div className="mt-4 bg-white rounded-xl shadow-lg text-left max-w-2xl mx-auto">
                {filteredArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/article/${article.id}`}
                    className="block p-4 hover:bg-gray-50 border-b border-gray-200 last:border-0"
                  >
                    <p className="font-semibold text-gray-900">{article.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{article.category}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Browse by Category</h2>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-900 font-semibold"
              >
                All Categories
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {filteredCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="bg-white rounded-xl shadow-sm p-6 text-left hover:shadow-lg transition-all border-2 border-transparent hover:border-gray-900"
              >
                <div className="w-14 h-14 flex items-center justify-center bg-gray-100 rounded-xl mb-4">
                  <i className={`${category.icon} text-3xl text-gray-900`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{category.title}</h3>
                <p className="text-gray-600">{category.count} placeholder articles</p>

                {selectedCategory === category.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                    {category.articles.map((article) => (
                      <Link
                        key={article.id}
                        href={`/help/article/${article.id}`}
                        className="block text-sm text-gray-700 hover:text-gray-900 font-medium"
                      >
                        • {article.title}
                      </Link>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
            <div className="space-y-4">
              {popularArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/help/article/${article.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{article.title}</p>
                    <p className="text-sm text-gray-600">{article.category}</p>
                  </div>
                  <i className="ri-arrow-right-s-line text-2xl text-gray-400"></i>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
