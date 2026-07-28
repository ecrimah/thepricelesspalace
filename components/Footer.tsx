"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useCMS } from '@/context/CMSContext';

function FooterSection({ title, children }: { title: string, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/15 lg:border-none last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left lg:py-0 lg:cursor-default lg:mb-4"
      >
        <h4 className="font-bold text-lg text-white">{title}</h4>
        <i className={`ri-arrow-down-s-line text-[#60a5fa] text-xl transition-transform duration-300 lg:hidden ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0 lg:max-h-full lg:overflow-visible'}`}>
        {children}
      </div>
    </div>
  );
}

export default function Footer() {
  const { getSetting } = useCMS();
  const rawSiteName = getSetting("site_name") || "";
  const siteName =
    rawSiteName || "The Priceless Palace";
  const siteTagline =
    getSetting("site_tagline") ||
    "Dresses, bags, slippers, wigs & more";
  const contactEmail = getSetting('contact_email') || 'hello@thepricelesspalace.com';
  const contactPhone = getSetting("contact_phone") || "+233 20 178 3800";
  const contactPhoneAlt = getSetting("contact_phone_alt") || "054 559 8755";
  const contactAddress = getSetting("contact_address") || "Abavana Down, Victoria Guest House";
  const whatsappLink = 'https://wa.me/233201783800';

  return (
    <footer className="bg-[#1e40af] text-white rounded-t-[2rem] mt-8 lg:mt-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 py-8 lg:py-10">
        <div className="grid lg:grid-cols-4 gap-8 lg:gap-10">

          {/* Brand Column */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/" className="inline-block">
              <img
                src="/logo-white.png"
                alt={siteName}
                className="h-14 w-auto object-contain"
              />
            </Link>
            <p className="text-white/80 leading-relaxed text-sm">
              {siteTagline}{" "}
              <Link href="/admin" className="text-inherit hover:text-inherit no-underline" aria-label="Admin">.</Link>
            </p>

            <div className="flex gap-3 pt-2">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#1e40af] transition-all hover:-translate-y-1"
                aria-label="Chat on WhatsApp"
              >
                <i className="ri-whatsapp-line"></i>
              </a>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/15">
              {contactPhone && (
                <div className="flex flex-col gap-2">
                  <a href="tel:+233201783800" className="flex items-center gap-3 text-white/90 hover:text-white transition-colors text-sm">
                    <i className="ri-phone-line text-[#93c5fd]"></i> {contactPhone}
                  </a>
                  <a href="tel:+233545598755" className="flex items-center gap-3 text-white/90 hover:text-white transition-colors text-sm">
                    <i className="ri-phone-line text-[#93c5fd]"></i> {contactPhoneAlt}
                  </a>
                </div>
              )}
              {contactAddress && (
                <p className="flex items-start gap-3 text-white/85 text-sm">
                  <i className="ri-map-pin-line mt-0.5 text-[#93c5fd]"></i> {contactAddress}
                </p>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-white/90 hover:text-white transition-colors text-sm">
                  <i className="ri-mail-line text-[#93c5fd]"></i> {contactEmail}
                </a>
              )}
            </div>
          </div>

          {/* Links Sections */}
          <div className="lg:col-span-3 grid lg:grid-cols-3 gap-8 lg:gap-12">

            <FooterSection title="Shop">
              <ul className="space-y-3 text-white/80">
                <li><Link href="/shop" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> All Products</Link></li>
                <li><Link href="/categories" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Categories</Link></li>
                <li><Link href="/shop?sort=newest" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> New Arrivals</Link></li>
                <li><Link href="/shop?sort=bestsellers" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Best Sellers</Link></li>
              </ul>
            </FooterSection>

            <FooterSection title="Customer Care">
              <ul className="space-y-3 text-white/80">
                <li><Link href="/contact" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Contact Us</Link></li>
                <li><Link href="/order-tracking" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Track My Order</Link></li>
                <li><Link href="/shipping" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Shipping Info</Link></li>
                <li><Link href="/returns" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Returns Policy</Link></li>
              </ul>
            </FooterSection>

            <FooterSection title="Company">
              <ul className="space-y-3 text-white/80">
                <li><Link href="/about" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Our Story</Link></li>
                <li><Link href="/blog" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Blog</Link></li>
                <li><Link href="/privacy" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-[#60a5fa] transition-colors flex items-center gap-2"><i className="ri-arrow-right-s-line opacity-50"></i> Terms of Service</Link></li>
              </ul>
            </FooterSection>

          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/60">
          <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <div className="flex gap-4 grayscale opacity-50">
            <i className="ri-visa-line text-2xl"></i>
            <i className="ri-mastercard-line text-2xl"></i>
            <i className="ri-paypal-line text-2xl"></i>
          </div>
        </div>
      </div>
    </footer>
  );
}
