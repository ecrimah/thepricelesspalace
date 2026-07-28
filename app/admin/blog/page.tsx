'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function AdminBlogPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const posts = [
    {
      id: 1,
      title: 'Placeholder Blog Post',
      slug: 'placeholder-blog-post',
      author: 'Admin',
      category: 'General',
      image: '/placeholder-product.png',
      excerpt: 'Starter demo post. Replace with real content from the blog editor.',
      status: 'Draft',
      views: 0,
      comments: 0,
      publishDate: 'Jan 1, 2026',
      featured: false,
    },
  ];

  const statusColors: Record<string, string> = {
    Published: 'bg-gray-100 text-gray-900',
    Draft: 'bg-gray-100 text-gray-700',
    Scheduled: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-gray-600 mt-1">Create and manage your blog content</p>
        </div>
        <Link href="/admin/blog/new" className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap">
          <i className="ri-add-line mr-2"></i>
          New Post
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Posts</p>
          <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Published</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Views</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Comments</p>
          <p className="text-2xl font-bold text-blue-700">0</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-end">
          <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${
                viewMode === 'grid' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className="ri-grid-line text-xl"></i>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`w-10 h-10 flex items-center justify-center border-l-2 border-gray-300 transition-colors ${
                viewMode === 'list' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className="ri-list-check text-xl"></i>
            </button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <div key={post.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-gray-900">{post.category}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{post.excerpt}</p>
                  <Link
                    href={`/admin/blog/${post.id}`}
                    className="block bg-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors"
                  >
                    Edit Post
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Post</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-100">
                    <td className="py-4 px-4 font-semibold text-gray-900">{post.title}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Link href={`/admin/blog/${post.id}`} className="text-gray-900 hover:text-gray-700 font-medium">
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
