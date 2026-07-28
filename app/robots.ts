import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

  if (!allowIndexing) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: baseUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/checkout', '/cart', '/account/'],
      },
    ],
    host: baseUrl,
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
