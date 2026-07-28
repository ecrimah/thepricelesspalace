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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "The Priceless Palace",
  category: "shopping",
  referrer: "origin-when-cross-origin",
  title: {
    default: "The Priceless Palace | Dresses, Bags, Slippers, Wigs & More",
    template: "%s | The Priceless Palace",
  },
  description:
    "Shop dresses, bags, slippers, wigs and more at The Priceless Palace — Abavana Down, Queenstar Guest House.",
  keywords: [
    "The Priceless Palace",
    "dresses",
    "bags",
    "slippers",
    "wigs",
    "Abavana",
    "Ghana fashion",
  ],
  authors: [{ name: "The Priceless Palace" }],
  creator: "The Priceless Palace",
  publisher: "The Priceless Palace",
  robots: allowIndexing
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
  icons: {
    shortcut: [{ url: "/favicon.ico" }],
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "The Priceless Palace",
  },
  formatDetection: {
    telephone: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  openGraph: {
    type: "website",
    locale: "en_GH",
    url: siteUrl,
    title: "The Priceless Palace | Dresses, Bags, Slippers, Wigs & More",
    description:
      "Shop dresses, bags, slippers, wigs and more — Abavana Down, Queenstar Guest House.",
    siteName: "The Priceless Palace",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Priceless Palace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Priceless Palace",
    description:
      "Dresses, bags, slippers, wigs & more — Abavana Down, Queenstar Guest House.",
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
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="The Priceless Palace" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#1e40af" />
        <meta name="msapplication-tap-highlight" content="no" />

        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "@id": `${siteUrl}#organization`,
              name: "The Priceless Palace",
              url: siteUrl,
              logo: `${siteUrl}/logo.png`,
              description:
                "Dresses, bags, slippers, wigs and more at Abavana Down, Queenstar Guest House.",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Abavana Down, Queenstar Guest House",
                addressCountry: "GH",
              },
              telephone: "+233201783800",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                telephone: "+233201783800",
                email: "hello@thepricelesspalace.com",
                availableLanguage: "English",
              },
            }),
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
