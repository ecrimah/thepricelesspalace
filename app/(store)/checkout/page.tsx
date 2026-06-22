'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CheckoutSteps from '@/components/CheckoutSteps';
import OrderSummary from '@/components/OrderSummary';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRecaptcha } from '@/hooks/useRecaptcha';

export default function CheckoutPage() {
  usePageTitle('Checkout');
  const router = useRouter();
  const { cart, subtotal: cartSubtotal, clearCart, appliedCoupon, discount } = useCart();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'guest' | 'account'>('guest');
  const [saveAddress, setSaveAddress] = useState(false);
  const [savePayment, setSavePayment] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { getToken, verifying } = useRecaptcha();

  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: ''
  });

  // Ghana regions for dropdown
  const ghanaRegions = [
    'Greater Accra',
    'Ashanti',
    'Western',
    'Western North',
    'Central',
    'Eastern',
    'Volta',
    'Oti',
    'Northern',
    'Savannah',
    'North East',
    'Upper East',
    'Upper West',
    'Bono',
    'Bono East',
    'Ahafo'
  ];

  const [deliveryMethod, setDeliveryMethod] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [errors, setErrors] = useState<any>({});



  // Check auth and cart
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setCheckoutType('account'); // Auto-select account checkout if logged in
        // Pre-fill email if available
        setShippingData(prev => ({ ...prev, email: session.user.email || '' }));
      }
    }
    checkUser();

    // Small delay to ensure cart load
    const timer = setTimeout(() => {
      if (cart.length === 0 && !isLoading) {
        // router.push('/cart'); // Optional: redirect if empty
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cart, router, isLoading]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Calculate Totals
  const subtotal = cartSubtotal;
  const shippingCost = 0; // Delivery options temporarily disabled
  const tax = 0; // No Tax
  const couponDiscount = Math.min(discount || 0, subtotal);
  const total = Math.max(0, subtotal - couponDiscount + shippingCost + tax);

  const validateShipping = () => {
    const newErrors: any = {};
    if (!shippingData.firstName) newErrors.firstName = 'First name is required';
    if (!shippingData.lastName) newErrors.lastName = 'Last name is required';
    if (!shippingData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(shippingData.email)) newErrors.email = 'Invalid email';
    if (!shippingData.phone) newErrors.phone = 'Phone is required';
    if (!shippingData.address) newErrors.address = 'Address is required';
    if (!shippingData.city) newErrors.city = 'City is required';
    if (!shippingData.region) newErrors.region = 'Region is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToDelivery = () => {
    if (validateShipping()) {
      setCurrentStep(2);
    }
  };

  const handleContinueToPayment = async () => {
    // Skip step 3 and directly initiate payment with default method (Paystack)
    await handlePlaceOrder();
  };



  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    setIsLoading(true);

    // reCAPTCHA verification
    const isHuman = await getToken('checkout');
    if (!isHuman) {
      alert('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      // Generate tracking number: SLI-XXXXXX (6-char alphanumeric)
      const trackingId = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      const trackingNumber = `SLI-${trackingId}`;

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          user_id: user?.id || null, // Capture user_id if logged in
          email: shippingData.email,
          phone: shippingData.phone,
          status: 'pending',
          payment_status: 'pending',
          currency: 'GHS',
          subtotal: subtotal,
          tax_total: tax,
          shipping_total: shippingCost,
          discount_total: couponDiscount,
          total: total,
          shipping_method: deliveryMethod,
          payment_method: paymentMethod,
          shipping_address: shippingData,
          billing_address: shippingData, // Using same for now
          metadata: {
            guest_checkout: !user,
            first_name: shippingData.firstName,
            last_name: shippingData.lastName,
            tracking_number: trackingNumber,
            coupon_code: appliedCoupon?.code || null,
            coupon_discount: couponDiscount || null
          }
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items (with UUID validation)
      // Helper to check if string is a valid UUID
      const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      // Build order items, resolving slugs to UUIDs if needed
      const orderItems = [];
      
      // Batch-fetch product metadata (for preorder_shipping etc.)
      const productIds = cart.map(item => item.id).filter(id => isValidUUID(id));
      const { data: productsData } = productIds.length > 0
        ? await supabase.from('products').select('id, metadata').in('id', productIds)
        : { data: [] };
      const productMetaMap = new Map((productsData || []).map((p: any) => [p.id, p.metadata]));
      
      for (const item of cart) {
        let productId = item.id;
        
        // If id is not a valid UUID, it might be a slug - try to resolve it
        if (!isValidUUID(productId)) {
          const { data: product } = await supabase
            .from('products')
            .select('id, metadata')
            .or(`slug.eq.${productId},id.eq.${productId}`)
            .single();
          
          if (product) {
            productId = product.id;
            productMetaMap.set(product.id, product.metadata);
          } else {
            throw new Error(`Product not found: ${item.name}. Please remove it from your cart and try again.`);
          }
        }
        
        const prodMeta = productMetaMap.get(productId);
        
        orderItems.push({
          order_id: order.id,
          product_id: productId,
          product_name: item.name,
          variant_name: item.variant,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          metadata: {
            image: item.image,
            slug: item.slug,
            preorder_shipping: prodMeta?.preorder_shipping || null
          }
        });
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Record coupon usage (best-effort, server-side via service role)
      if (appliedCoupon?.code) {
        fetch('/api/storefront/coupons/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: appliedCoupon.code }),
        }).catch((e) => console.error('Coupon redeem trigger error:', e));
      }

      // Note: Stock reduction happens in mark_order_paid when payment is confirmed

      // 3. Upsert Customer Record (for both guest and registered users)
      const fullName = `${shippingData.firstName} ${shippingData.lastName}`.trim();
      await supabase.rpc('upsert_customer_from_order', {
        p_email: shippingData.email,
        p_phone: shippingData.phone,
        p_full_name: fullName,
        p_first_name: shippingData.firstName,
        p_last_name: shippingData.lastName,
        p_user_id: user?.id || null,
        p_address: shippingData
      });

      // 4. Handle Payment Redirects or Completion
      if (paymentMethod === 'paystack') {
        try {
          // Payment link reminder will be sent automatically after 15 mins if unpaid (via cron)

          const paymentRes = await fetch('/api/payment/paystack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderNumber,
              amount: total,
              customerEmail: shippingData.email
            })
          });

          const paymentResult = await paymentRes.json();

          if (!paymentResult.success) {
            throw new Error(paymentResult.message || 'Payment initialization failed');
          }

          // Clear cart before redirecting
          clearCart();

          // Redirect to Paystack
          window.location.href = paymentResult.url;
          return;

        } catch (paymentErr: any) {
          console.error('Payment Error:', paymentErr);
          alert('Failed to initialize payment: ' + paymentErr.message);
          setIsLoading(false);
          return; // Stop execution
        }
      }

      // 5. Send Notifications (For COD or others)
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order_created',
          payload: order
        })
      }).catch(err => console.error('Notification trigger error:', err));

      // 6. Clear Cart & Redirect (For COD)
      clearCart();
      router.push(`/order-success?order=${orderNumber}`);

    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Failed to place order: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.length === 0 && !isLoading) {
    return (
      <main className="min-h-screen bg-white py-20">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <i className="ri-shopping-cart-line text-4xl text-gray-300"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some items to start the checkout process.</p>
          <Link href="/shop" className="inline-block bg-[#141414] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#141414]/90 transition-colors">
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/cart" className="text-[#141414]/60 hover:text-[#141414] font-medium inline-flex items-center whitespace-nowrap">
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Cart
          </Link>
        </div>

        <div className="mb-8">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-[#C9A24E]">
            <span className="h-px w-6 bg-[#C9A24E]/60" />
            Almost there
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-[#141414]">Checkout</h1>
        </div>

        {currentStep === 1 && (
          <div className="mb-8 bg-white rounded-2xl shadow-sm ring-1 ring-[#141414]/[0.06] p-6">
            <h2 className="text-xl font-bold text-[#141414] mb-6">Checkout As</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => !user && setCheckoutType('guest')}
                className={`p-6 rounded-2xl border-2 transition-all text-left cursor-pointer ${checkoutType === 'guest'
                  ? 'border-[#C9A24E] bg-[#C9A24E]/[0.07]'
                  : 'border-gray-200 hover:border-[#C9A24E]/40'
                  } ${user ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!!user}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white">
                    <i className="ri-user-line text-xl"></i>
                  </span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checkoutType === 'guest' ? 'border-[#C9A24E] bg-[#C9A24E]' : 'border-gray-300'
                    }`}>
                    {checkoutType === 'guest' && <i className="ri-check-line text-white text-sm"></i>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#141414] mb-1">Guest Checkout</h3>
                <p className="text-sm text-gray-600">Quick checkout without creating an account</p>
                {user && <p className="text-xs text-[#C9A24E] mt-2">You are logged in</p>}
              </button>

              <button
                onClick={() => setCheckoutType('account')}
                className={`p-6 rounded-2xl border-2 transition-all text-left cursor-pointer ${checkoutType === 'account'
                  ? 'border-[#C9A24E] bg-[#C9A24E]/[0.07]'
                  : 'border-gray-200 hover:border-[#C9A24E]/40'
                  }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A24E] to-[#9C7A2E] text-white">
                    <i className="ri-account-circle-line text-xl"></i>
                  </span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checkoutType === 'account' ? 'border-[#C9A24E] bg-[#C9A24E]' : 'border-gray-300'
                    }`}>
                    {checkoutType === 'account' && <i className="ri-check-line text-white text-sm"></i>}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-[#141414] mb-1">{user ? 'My Account' : 'Create Account'}</h3>
                <p className="text-sm text-gray-600">
                  {user ? `Logged in as ${user.email}` : 'Save info, track orders & earn loyalty points'}
                </p>
              </button>
            </div>
          </div>
        )}

        <CheckoutSteps currentStep={currentStep} />

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-[#141414]/[0.06] p-6 mb-6">
                  <h2 className="text-xl font-bold text-[#141414] mb-6">Shipping Information</h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.firstName}
                          onChange={(e) => setShippingData({ ...shippingData, firstName: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.firstName ? 'border-[#FF6666]' : 'border-gray-300'
                            }`}
                          placeholder="John"
                        />
                        {errors.firstName && <p className="text-sm text-[#9A1900] mt-1">{errors.firstName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={shippingData.lastName}
                          onChange={(e) => setShippingData({ ...shippingData, lastName: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.lastName ? 'border-[#FF6666]' : 'border-gray-300'
                            }`}
                          placeholder="Doe"
                        />
                        {errors.lastName && <p className="text-sm text-[#9A1900] mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={shippingData.email}
                        readOnly={!!user} // Make read-only if logged in (optional, but safer)
                        onChange={(e) => setShippingData({ ...shippingData, email: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.email ? 'border-[#FF6666]' : 'border-gray-300'
                          } ${user ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="you@example.com"
                      />
                      {errors.email && <p className="text-sm text-[#9A1900] mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={shippingData.phone}
                        onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.phone ? 'border-[#FF6666]' : 'border-gray-300'
                          }`}
                        placeholder="+233 XX XXX XXXX"
                      />
                      {errors.phone && <p className="text-sm text-[#9A1900] mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={shippingData.address}
                        onChange={(e) => setShippingData({ ...shippingData, address: e.target.value })}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.address ? 'border-[#FF6666]' : 'border-gray-300'
                          }`}
                        placeholder="House number and street name"
                      />
                      {errors.address && <p className="text-sm text-[#9A1900] mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={shippingData.city}
                          onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] ${errors.city ? 'border-[#FF6666]' : 'border-gray-300'
                            }`}
                          placeholder="Accra"
                        />
                        {errors.city && <p className="text-sm text-[#9A1900] mt-1">{errors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                          Region *
                        </label>
                        <select
                          value={shippingData.region}
                          onChange={(e) => setShippingData({ ...shippingData, region: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-[#C9A24E] focus:border-[#C9A24E] bg-white ${errors.region ? 'border-[#FF6666]' : 'border-gray-300'
                            }`}
                        >
                          <option value="">Select Region</option>
                          {ghanaRegions.map((region) => (
                            <option key={region} value={region}>{region}</option>
                          ))}
                        </select>
                        {errors.region && <p className="text-sm text-[#9A1900] mt-1">{errors.region}</p>}
                      </div>
                    </div>

                    {checkoutType === 'account' && (
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="w-5 h-5 text-[#141414] rounded border-gray-300 focus:ring-[#C9A24E]"
                        />
                        <span className="text-sm text-gray-700">Save this address for future orders</span>
                      </label>
                    )}
                  </div>

                  <button
                    onClick={handleContinueToDelivery}
                    className="w-full mt-6 bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] text-white py-4 rounded-xl font-semibold shadow-[0_14px_30px_-12px_rgba(201,162,78,0.9)] hover:brightness-105 transition-all whitespace-nowrap cursor-pointer"
                  >
                    Continue to Delivery
                  </button>
                </div>


              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-[#141414]/[0.06] p-6 mb-6">
                  <h2 className="text-xl font-bold text-[#141414] mb-6">Delivery Method</h2>
                  <div className="space-y-4">
                    <label className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-colors ${deliveryMethod === 'pickup' ? 'border-[#C9A24E] bg-[#C9A24E]/[0.07]' : 'border-gray-200 hover:border-[#C9A24E]/40'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="delivery"
                          value="pickup"
                          checked={deliveryMethod === 'pickup'}
                          onChange={(e) => setDeliveryMethod(e.target.value)}
                          className="w-5 h-5 accent-[#C9A24E]"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Store Pickup</p>
                          <p className="text-sm text-gray-600">Pick up from our store — Ready in 24 hours</p>
                        </div>
                      </div>
                      <p className="font-bold text-[#141414]">FREE</p>
                    </label>

                    <label className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-colors ${deliveryMethod === 'doorstep' ? 'border-[#C9A24E] bg-[#C9A24E]/[0.07]' : 'border-gray-200 hover:border-[#C9A24E]/40'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input
                          type="radio"
                          name="delivery"
                          value="doorstep"
                          checked={deliveryMethod === 'doorstep'}
                          onChange={(e) => setDeliveryMethod(e.target.value)}
                          className="w-5 h-5 accent-[#C9A24E]"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">Doorstep Delivery</p>
                          <p className="text-sm text-gray-600">We will contact you with the delivery cost</p>
                        </div>
                      </div>
                      <p className="font-semibold text-[#C9A24E] text-sm">At a Cost</p>
                    </label>

                    {/* Comprehensive delivery options - to be re-enabled later
                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'accra' ? 'border-[#141414] bg-[#F3F3F3]' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input type="radio" name="delivery" value="accra" checked={deliveryMethod === 'accra'} onChange={(e) => setDeliveryMethod(e.target.value)} className="w-5 h-5 text-[#141414]" />
                        <div>
                          <p className="font-semibold text-gray-900">Accra Delivery</p>
                          <p className="text-sm text-gray-600">Delivery within Accra</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">₵ 40.00</p>
                    </label>
                    <label className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${deliveryMethod === 'outside-accra' ? 'border-[#141414] bg-[#F3F3F3]' : 'border-gray-300 hover:border-gray-400'
                      }`}>
                      <div className="flex items-center space-x-4">
                        <input type="radio" name="delivery" value="outside-accra" checked={deliveryMethod === 'outside-accra'} onChange={(e) => setDeliveryMethod(e.target.value)} className="w-5 h-5 text-[#141414]" />
                        <div>
                          <p className="font-semibold text-gray-900">Outside Accra Delivery</p>
                          <p className="text-sm text-gray-600">Delivery to bus stations (VIP, OA, STC, etc.)</p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900">₵ 30.00</p>
                    </label>
                    */}
                  </div>

                  <div className="flex flex-col-reverse md:flex-row gap-4 mt-6">
                    <button
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                      className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 py-4 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleContinueToPayment}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-[#C9A24E] to-[#9C7A2E] text-white py-4 rounded-xl font-semibold shadow-[0_14px_30px_-12px_rgba(201,162,78,0.9)] hover:brightness-105 transition-all whitespace-nowrap cursor-pointer disabled:opacity-70 flex items-center justify-center"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        'Pay Securely'
                      )}
                    </button>
                  </div>
                </div>


              </>
            )}

            {/* Step 3 removed - payment now initiates directly from step 2 */}
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              items={cart}
              subtotal={subtotal}
              shipping={shippingCost}
              tax={tax}
              total={total}
              discount={couponDiscount}
              couponCode={appliedCoupon?.code}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
