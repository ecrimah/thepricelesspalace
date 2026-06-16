import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import "./globals.css";

const montserrat = Montserrat({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://wholesalequeen.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "Wholesale Queen",
  category: "shopping",
  referrer: "origin-when-cross-origin",
  title: {
    default: "Wholesale Queen | China Wholesale — Shein Bales, Mannequins & Appliances",
    template: "%s | Wholesale Queen",
  },
  description:
    "Wholesale Queen brings you China wholesale at unbeatable prices — Shein bales, mannequins, and home appliances delivered across Ghana.",
  keywords: [
    "Wholesale Queen",
    "China wholesale Ghana",
    "Shein bale wholesale",
    "mannequins Ghana",
    "home appliances Ghana",
    "wholesale clothing Accra",
    "bale of clothes Ghana",
    "Ashongman wholesale",
    "import wholesale Ghana",
    "affordable wholesale",
  ],
  authors: [{ name: "Wholesale Queen" }],
  creator: "Wholesale Queen",
  publisher: "Wholesale Queen",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    shortcut: [{ url: '/favicon.ico' }],
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wholesale Queen",
  },
  formatDetection: {
    telephone: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: siteUrl,
    title: "Wholesale Queen | China Wholesale — Shein Bales, Mannequins & Appliances",
    description:
      "China wholesale at unbeatable prices — Shein bales, mannequins, and home appliances delivered across Ghana.",
    siteName: "Wholesale Queen",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Wholesale Queen logo and brand preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Queen | China Wholesale — Shein Bales, Mannequins & Appliances",
    description:
      "China wholesale at unbeatable prices — Shein bales, mannequins, and home appliances delivered across Ghana.",
    images: ["/twitter-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

// Google Analytics Measurement ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
// Google reCAPTCHA v3 Site Key
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#141414" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Wholesale Queen" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#141414" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="384x384" href="/icons/icon-384x384.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />

        {/* Apple Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />

        {/* Structured Data - Organization + Local Business */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}#organization`,
                  "name": "Wholesale Queen",
                  "url": siteUrl,
                  "logo": `${siteUrl}/wholesalequeen-logo.png`,
                  "image": `${siteUrl}/og-image.png`,
                  "description": "China wholesale at unbeatable prices — Shein bales, mannequins, and home appliances delivered across Ghana.",
                  "sameAs": ["https://www.instagram.com/chinawholesalequeen", "https://wa.me/233542849341", "https://www.tiktok.com/@chinawholesalequeen"],
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "contactType": "customer service",
                    "telephone": "+233542849341",
                    "availableLanguage": "English"
                  }
                },
                {
                  "@type": "Store",
                  "@id": `${siteUrl}#store`,
                  "name": "Wholesale Queen",
                  "url": siteUrl,
                  "image": `${siteUrl}/og-image.png`,
                  "telephone": "+233542849341",
                  "priceRange": "$$",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Accra",
                    "streetAddress": "Ashongman Estate",
                    "addressCountry": "GH"
                  },
                  "areaServed": "Ghana"
                }
              ]
            })
          }}
        />
      </head>

      {/* Google Analytics */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      {/* Google reCAPTCHA v3 */}
      {RECAPTCHA_SITE_KEY && (
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
          strategy="afterInteractive"
        />
      )}

      <body className={`antialiased overflow-x-hidden pwa-body ${montserrat.variable} font-sans`} style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}>
        {/* RemixIcon font — rendered here so React 19 hoists it into <head>
            consistently on the server and client (avoids hydration mismatch). */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/remixicon@4.1.0/fonts/remixicon.css"
          precedence="default"
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:px-6 focus:py-3 focus:bg-gray-900 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
        >
          Skip to main content
        </a>
        <CartProvider>
          <WishlistProvider>
            <div id="main-content">
              {children}
            </div>
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  );
}
