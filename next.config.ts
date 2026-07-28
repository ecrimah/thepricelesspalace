import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    // Playbook: unoptimized until sharp + .next/cache are healthy on Coolify
    unoptimized: true,
    formats: ['image/webp'],
    minimumCacheTTL: 2592000,
    qualities: [50, 60, 70, 75, 80, 90, 100],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'thepricelesspalace.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.thepricelesspalace.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      // Fallback: serve disk objects via storage shim (nginx can alias STORAGE_ROOT in prod)
      {
        source: '/uploads/:path*',
        destination: '/storage/v1/object/public/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      },
      {
        source: '/service-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type', value: 'application/manifest+json' }
        ]
      },
      {
        source: '/api/storefront/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=900, stale-while-revalidate=1800' }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
    ];
  }
};

export default nextConfig;
