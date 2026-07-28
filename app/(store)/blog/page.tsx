import Link from 'next/link';

export default function BlogPage() {
  const posts = [
    {
      id: '1',
      title: 'Welcome to the Blog',
      excerpt: 'Placeholder post. Replace with your own articles when you are ready to publish.',
      category: 'General',
      date: 'January 1, 2026',
      readTime: '1 min read',
      author: 'Editor',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Blog</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Articles and updates will appear here. This is starter placeholder content.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Latest Articles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium text-xs">
                    {post.category}
                  </span>
                  <span className="text-xs">{post.date}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{post.excerpt}</p>
                <p className="text-sm text-gray-500 mt-4">{post.author} · {post.readTime}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
