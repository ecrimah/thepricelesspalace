import Link from 'next/link';

export default function ShippingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-gray-100 via-white to-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Shipping & Delivery</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Configure delivery options and zones for your store. This page is starter placeholder content.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <section className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery Options</h2>
          <p className="text-gray-600 leading-relaxed">
            Standard, express, and pickup options can be defined in admin. Update this page with your real
            shipping policy before launch.
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Tracking</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Customers can track orders once tracking is enabled for your store.
          </p>
          <Link
            href="/order-tracking"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Track Your Order
          </Link>
        </section>

        <section className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h2>
          <p className="text-gray-600 mb-6">Contact support for shipping questions.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
          >
            Contact Support
          </Link>
        </section>
      </div>
    </div>
  );
}
