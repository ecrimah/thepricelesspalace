'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

const PENDING_ORDER_KEY = 'palace_pending_order';

function readPendingEmail(orderNumber: string | null): string {
  if (!orderNumber || typeof window === 'undefined') return '';
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (parsed?.orderNumber === orderNumber && typeof parsed?.email === 'string') {
      return parsed.email.trim().toLowerCase();
    }
  } catch {
    /* ignore */
  }
  return '';
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const paymentSuccess = searchParams.get('payment_success');
  const emailFromQuery = (searchParams.get('email') || '').trim().toLowerCase();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [emailNeeded, setEmailNeeded] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const loadOrder = async (orderNum: string, email: string) => {
    const res = await fetch(
      `/api/storefront/orders/${encodeURIComponent(orderNum)}?email=${encodeURIComponent(email)}`
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Order not found');
    return json.order;
  };

  useEffect(() => {
    async function fetchOrder() {
      if (!orderNumber) {
        setLoading(false);
        return;
      }

      const email = emailFromQuery || readPendingEmail(orderNumber);
      if (!email) {
        setEmailNeeded(true);
        setLoading(false);
        return;
      }

      setLookupEmail(email);
      try {
        const orderData = await loadOrder(orderNumber, email);
        setOrder(orderData);
        setEmailNeeded(false);
        try {
          sessionStorage.removeItem(PENDING_ORDER_KEY);
        } catch {
          /* ignore */
        }

        // If redirected from payment and order is still pending, try to verify
        if (paymentSuccess === 'true' && orderData && orderData.payment_status !== 'paid') {
          verifyPayment(orderNumber, orderData);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setEmailNeeded(true);
        setLookupError('We could not load this order with that email. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderNumber, paymentSuccess, emailFromQuery]);

  // Payment verification - called when user is redirected from Moolre with payment_success=true
  const verifyPayment = async (orderNum: string, _initialOrder: any) => {
    setVerifying(true);

    const refreshOrder = async () => {
      const email =
        lookupEmail ||
        emailFromQuery ||
        readPendingEmail(orderNum) ||
        _initialOrder?.email ||
        '';
      if (!email) return null;
      return loadOrder(orderNum, email).catch(() => null);
    };

    // Retry loop: check every 3s for up to 30s to give the webhook time to fire
    const delays = [3000, 3000, 4000, 5000, 5000, 5000, 5000];
    for (const delay of delays) {
      await new Promise(resolve => setTimeout(resolve, delay));
      const refreshed = await refreshOrder().catch(() => null);
      if (refreshed?.payment_status === 'paid') {
        setOrder(refreshed);
        setVerifying(false);
        return;
      }
    }

    // Webhook never fired — re-query the gateway used for this order
    try {
      const current = await refreshOrder().catch(() => null);
      // Hubtel / Paystack verify disabled — Moolre only
      const method = current?.payment_method || _initialOrder?.payment_method || 'moolre';
      const endpoints = ['/api/payment/moolre/verify'];
      void method;
      /*
      method === 'paystack'
        ? ['/api/payment/paystack/verify', '/api/payment/hubtel/verify', '/api/payment/moolre/verify']
        : method === 'moolre'
          ? ['/api/payment/moolre/verify', '/api/payment/paystack/verify', '/api/payment/hubtel/verify']
          : ['/api/payment/hubtel/verify', '/api/payment/paystack/verify', '/api/payment/moolre/verify'];
      */

      for (const endpoint of endpoints) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber: orderNum })
        });
        const result = await res.json();
        console.log('[Success] Verify result from', endpoint, ':', result);
        if (result.success && result.payment_status === 'paid') {
          const updated = await refreshOrder().catch(() => null);
          if (updated) setOrder(updated);
          break;
        }
      }
    } catch (err) {
      console.error('[Success] Payment verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-gray-900 animate-spin mb-4 block"></i>
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Payment return often loses context — ask for the checkout email to load the receipt
  if (!order) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <i className="ri-mail-check-line text-4xl text-[#2563eb] mb-4 block"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {orderNumber ? 'Confirm your email' : 'Order Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            {orderNumber
              ? 'Enter the email you used at checkout to view your order confirmation.'
              : "We couldn't locate the order details."}
          </p>
          {orderNumber && (
            <form
              className="space-y-3 text-left"
              onSubmit={async (e) => {
                e.preventDefault();
                const email = lookupEmail.trim().toLowerCase();
                if (!email.includes('@')) {
                  setLookupError('Please enter a valid email address.');
                  return;
                }
                setLookupError(null);
                setLoading(true);
                try {
                  const orderData = await loadOrder(orderNumber, email);
                  setOrder(orderData);
                  setEmailNeeded(false);
                  if (paymentSuccess === 'true' && orderData.payment_status !== 'paid') {
                    verifyPayment(orderNumber, orderData);
                  }
                } catch {
                  setLookupError('No order found for that email. Check and try again.');
                } finally {
                  setLoading(false);
                }
              }}
            >
              {orderNumber && (
                <p className="text-sm text-gray-500 mb-1">
                  Order <span className="font-semibold text-gray-800">{orderNumber}</span>
                </p>
              )}
              <input
                type="email"
                required
                value={lookupEmail}
                onChange={(e) => setLookupEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/40"
              />
              {lookupError && <p className="text-sm text-[#b91c1c]">{lookupError}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#2563eb] text-white py-3 font-semibold hover:bg-[#1d4ed8] transition-colors"
              >
                View order
              </button>
            </form>
          )}
          <Link href="/shop" className="inline-block mt-6 text-gray-900 font-semibold hover:underline">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const estimatedDelivery = new Date(new Date(order.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const pointsEarned = Math.floor(order.total / 10); // Example logic: 1 point per 10 currency units

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#F3F3F3]">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <i className={`ri-${['heart', 'star', 'gift'][Math.floor(Math.random() * 3)]}-fill ${['text-gray-500', 'text-[#60a5fa]', 'text-[#2563eb]'][Math.floor(Math.random() * 3)]} text-xl opacity-70`}></i>
            </div>
          ))}
        </div>
      )}

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center mb-8">
            <div className="w-24 h-24 flex items-center justify-center mx-auto mb-6 bg-gray-100 rounded-full">
              <i className="ri-checkbox-circle-fill text-6xl text-gray-700"></i>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for your purchase. We're processing your order now.
            </p>

            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="text-lg font-bold text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="text-lg font-bold text-gray-900">{orderDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Estimated Delivery</p>
                  <p className="text-lg font-bold text-gray-900">{estimatedDelivery}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                href={`/account?tab=orders`}
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 rounded-lg font-semibold transition-colors inline-flex items-center justify-center whitespace-nowrap"
              >
                <i className="ri-file-list-3-line mr-2"></i>
                View Order
              </Link>
              <Link
                href="/shop"
                className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg font-semibold transition-colors inline-flex items-center justify-center whitespace-nowrap"
              >
                <i className="ri-shopping-bag-line mr-2"></i>
                Continue Shopping
              </Link>
            </div>

            <div className="bg-gradient-to-r from-[#FFFFCC]/50 to-[#F3F3F3] rounded-xl p-6 border-2 border-[#60a5fa]/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-[#60a5fa] rounded-full">
                    <i className="ri-star-fill text-white text-2xl"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 text-lg">You Earned {pointsEarned} Points!</p>
                    <p className="text-sm text-gray-600">Join our loyalty program to redeem.</p>
                  </div>
                </div>
                <Link
                  href="/register"
                  className="bg-[#60a5fa] hover:bg-[#2563eb] text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
                >
                  Join Now
                </Link>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.order_items.map((item: any) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {item.metadata?.image ? (
                        <img
                          src={item.metadata.image}
                          alt={item.product_name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 line-clamp-2">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.variant_name && (
                        <p className="text-xs text-gray-500">{item.variant_name}</p>
                      )}
                      {item.metadata?.preorder_shipping && (
                        <p className="text-xs text-[#996633] bg-[#FFFFCC]/50 inline-flex items-center gap-1 px-2 py-0.5 rounded mt-1 border border-[#60a5fa]/30">
                          <i className="ri-time-line"></i> {item.metadata.preorder_shipping}
                        </p>
                      )}
                    </div>
                    <p className="font-bold text-gray-900">₵{item.unit_price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Subtotal</span>
                  <span>₵{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Shipping</span>
                  <span>₵{order.shipping_total.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Total Paid</span>
                  <span>₵{order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Details</h2>
              <div className="space-y-3">
                {order.shipping_address && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Recipient</p>
                      <p className="font-semibold text-gray-900">
                        {order.shipping_address.firstName} {order.shipping_address.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Address</p>
                      <p className="text-gray-900">{order.shipping_address.address}</p>
                      <p className="text-gray-900">{order.shipping_address.city}, {order.shipping_address.region}</p>
                      <p className="text-gray-900">{order.shipping_address.postalCode}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Phone</p>
                      <p className="text-gray-900">{order.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="text-gray-900">{order.email}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <i className="ri-mail-line text-gray-900 mt-1"></i>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Email Confirmation</p>
                      <p className="text-sm text-gray-600">Sent to {order.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <i className="ri-box-3-line text-gray-900 mt-1"></i>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Processing</p>
                      <p className="text-sm text-gray-600">We'll pack your order today</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <i className="ri-truck-line text-gray-900 mt-1"></i>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Shipping Updates</p>
                      <p className="text-sm text-gray-600">Track via email & SMS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">Need help with your order?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/contact" className="text-gray-900 hover:text-gray-900 font-semibold whitespace-nowrap">
                <i className="ri-customer-service-line mr-1"></i>
                Contact Support
              </Link>
              <Link href="/account/orders" className="text-gray-900 hover:text-gray-900 font-semibold whitespace-nowrap">
                <i className="ri-question-line mr-1"></i>
                Order Help
              </Link>
              <Link href="/returns" className="text-gray-900 hover:text-gray-900 font-semibold whitespace-nowrap">
                <i className="ri-arrow-left-right-line mr-1"></i>
                Returns Policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
