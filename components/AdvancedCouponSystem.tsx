'use client';

import { useEffect, useState } from 'react';
import type { AppliedCoupon } from '@/context/CartContext';

interface AvailableCoupon {
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_purchase: number;
  maximum_discount: number | null;
}

interface AdvancedCouponSystemProps {
  subtotal: number;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  appliedCoupon: AppliedCoupon | null;
}

function describeCoupon(c: AvailableCoupon): string {
  if (c.description) return c.description;
  const min = c.minimum_purchase > 0 ? ` on orders over ₵${c.minimum_purchase}` : '';
  if (c.type === 'percentage') {
    const cap = c.maximum_discount ? ` (max ₵${c.maximum_discount})` : '';
    return `${c.value}% off${cap}${min}`;
  }
  if (c.type === 'fixed_amount') return `₵${c.value} off${min}`;
  return `Free shipping${min}`;
}

export default function AdvancedCouponSystem({
  subtotal,
  onApply,
  onRemove,
  appliedCoupon,
}: AdvancedCouponSystemProps) {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [loadedAvailable, setLoadedAvailable] = useState(false);

  // Re-validate an already-applied coupon if the subtotal drops below its minimum.
  useEffect(() => {
    if (appliedCoupon?.minimum_purchase && subtotal < appliedCoupon.minimum_purchase) {
      onRemove();
      setError(`Coupon "${appliedCoupon.code}" removed — minimum purchase of ₵${appliedCoupon.minimum_purchase} no longer met.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const validateAndApply = async (code: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/storefront/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error || 'Invalid coupon code.');
        return;
      }
      onApply(data.coupon as AppliedCoupon);
      setCouponCode('');
      setShowAvailable(false);
    } catch {
      setError('Could not validate coupon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const code = couponCode.trim();
    if (!code) {
      setError('Please enter a coupon code.');
      return;
    }
    validateAndApply(code);
  };

  const loadAvailable = async () => {
    const next = !showAvailable;
    setShowAvailable(next);
    if (next && !loadedAvailable) {
      try {
        const res = await fetch('/api/storefront/coupons/validate');
        const data = await res.json();
        setAvailableCoupons(Array.isArray(data.coupons) ? data.coupons : []);
      } catch {
        setAvailableCoupons([]);
      } finally {
        setLoadedAvailable(true);
      }
    }
  };

  return (
    <div className="space-y-4">
      {!appliedCoupon ? (
        <>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Have a coupon code?
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
                placeholder="Enter code"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 text-sm"
              />
              <button
                onClick={handleApply}
                disabled={loading}
                className="bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
              >
                {loading ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {error && (
              <p className="text-sm text-[#9A1900] mt-2 flex items-center">
                <i className="ri-error-warning-line mr-1"></i>
                {error}
              </p>
            )}
          </div>

          <button
            onClick={loadAvailable}
            className="text-sm text-gray-900 hover:text-gray-700 font-medium flex items-center whitespace-nowrap"
          >
            <i className={`ri-arrow-${showAvailable ? 'up' : 'down'}-s-line mr-1`}></i>
            {showAvailable ? 'Hide' : 'View'} available coupons
          </button>

          {showAvailable && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {!loadedAvailable ? (
                <p className="text-sm text-gray-500">Loading coupons...</p>
              ) : availableCoupons.length === 0 ? (
                <p className="text-sm text-gray-500">No coupons available right now.</p>
              ) : (
                availableCoupons.map((coupon) => {
                  const isEligible = !coupon.minimum_purchase || subtotal >= coupon.minimum_purchase;
                  const needed = coupon.minimum_purchase ? coupon.minimum_purchase - subtotal : 0;

                  return (
                    <div
                      key={coupon.code}
                      className={`bg-white rounded-lg p-4 border-2 transition-all ${
                        isEligible ? 'border-gray-200 hover:border-gray-300' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg font-bold text-sm">
                            {coupon.code}
                          </span>
                          {!isEligible && (
                            <span className="text-xs text-gray-500">Add ₵{needed.toFixed(2)} more</span>
                          )}
                        </div>
                        {isEligible && (
                          <button
                            onClick={() => validateAndApply(coupon.code)}
                            disabled={loading}
                            className="text-gray-900 hover:text-gray-700 font-semibold text-sm whitespace-nowrap disabled:opacity-60"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{describeCoupon(coupon)}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <i className="ri-price-tag-3-fill text-gray-900"></i>
                <span className="font-bold text-gray-800">{appliedCoupon.code}</span>
              </div>
              {appliedCoupon.description && (
                <p className="text-sm text-gray-900">{appliedCoupon.description}</p>
              )}
            </div>
            <button
              onClick={() => { onRemove(); setError(''); }}
              className="w-8 h-8 flex items-center justify-center text-gray-900 hover:text-gray-700 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
