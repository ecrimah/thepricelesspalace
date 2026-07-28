import Link from 'next/link';
import { sanitizeHtml } from '@/lib/sanitize';

export async function generateStaticParams() {
  return [{ id: '1' }];
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const post = {
    title: 'Welcome to the Blog',
    category: 'General',
    date: 'January 1, 2026',
    readTime: '1 min read',
    author: 'Editor',
    content: `
      <p>This is placeholder blog content for post ${id}.</p>
      <p>Replace this page with real articles from your CMS or admin when you launch.</p>
    `,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/blog" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
          <i className="ri-arrow-left-line"></i>
          Back to Blog
        </Link>

        <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
          {post.category}
        </span>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <p className="text-gray-500 mb-8">
          {post.author} · {post.date} · {post.readTime}
        </p>

        <article
          className="prose prose-lg max-w-none text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
        />
      </div>
    </div>
  );
}
