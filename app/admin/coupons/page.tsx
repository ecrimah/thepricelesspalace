'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_purchase: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  per_user_limit: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
};

type FormState = {
  code: string;
  description: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: string;
  minimum_purchase: string;
  maximum_discount: string;
  usage_limit: string;
  per_user_limit: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  minimum_purchase: '',
  maximum_discount: '',
  usage_limit: '',
  per_user_limit: '1',
  start_date: '',
  end_date: '',
  is_active: true,
};

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  free_shipping: 'Free Shipping',
};

function toDateInput(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
  };

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/coupons', {
        headers: await authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setCoupons(data.coupons || []);
      else console.error('Failed to load coupons:', data.error);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isCouponActive = (c: Coupon) => {
    if (!c.is_active) return false;
    const now = Date.now();
    if (c.start_date && new Date(c.start_date).getTime() > now) return false;
    if (c.end_date && new Date(c.end_date).getTime() < now) return false;
    if (c.usage_limit != null && (c.usage_count ?? 0) >= c.usage_limit) return false;
    return true;
  };

  const couponStatus = (c: Coupon): string => {
    if (!c.is_active) return 'Disabled';
    const now = Date.now();
    if (c.start_date && new Date(c.start_date).getTime() > now) return 'Scheduled';
    if (c.end_date && new Date(c.end_date).getTime() < now) return 'Expired';
    if (c.usage_limit != null && (c.usage_count ?? 0) >= c.usage_limit) return 'Expired';
    return 'Active';
  };

  const statusColors: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Expired: 'bg-gray-100 text-gray-700',
    Disabled: 'bg-red-100 text-red-700',
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: c.value != null ? String(c.value) : '',
      minimum_purchase: c.minimum_purchase ? String(c.minimum_purchase) : '',
      maximum_discount: c.maximum_discount != null ? String(c.maximum_discount) : '',
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      per_user_limit: c.per_user_limit != null ? String(c.per_user_limit) : '1',
      start_date: toDateInput(c.start_date),
      end_date: toDateInput(c.end_date),
      is_active: !!c.is_active,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setFormError('');
    if (!form.code.trim()) {
      setFormError('Coupon code is required.');
      return;
    }
    if (form.type !== 'free_shipping' && (!form.value || Number(form.value) <= 0)) {
      setFormError('Discount value must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code,
        description: form.description,
        type: form.type,
        value: form.type === 'free_shipping' ? 0 : Number(form.value),
        minimum_purchase: form.minimum_purchase,
        maximum_discount: form.maximum_discount,
        usage_limit: form.usage_limit,
        per_user_limit: form.per_user_limit,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active,
      };

      const url = editingId ? `/api/admin/coupons/${editingId}` : '/api/admin/coupons';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: await authHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save coupon.');
        return;
      }
      setShowModal(false);
      await fetchCoupons();
    } catch (e: any) {
      setFormError(e?.message || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/coupons/${c.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete coupon.');
        return;
      }
      await fetchCoupons();
    } catch (e: any) {
      alert(e?.message || 'Failed to delete coupon.');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
  };

  const activeCoupons = coupons.filter((c) => couponStatus(c) === 'Active');
  const totalUses = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);

  const formatValue = (c: Coupon) => {
    if (c.type === 'percentage') return `${c.value}%`;
    if (c.type === 'fixed_amount') return `₵ ${Number(c.value).toFixed(2)}`;
    return 'Free Shipping';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coupons & Promotions</h1>
          <p className="text-gray-600 mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line mr-2"></i>
          Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Coupons</p>
          <p className="text-2xl font-bold text-gray-900">{coupons.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-gray-900">{activeCoupons.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Uses</p>
          <p className="text-2xl font-bold text-gray-900">{totalUses}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Currently Inactive</p>
          <p className="text-2xl font-bold text-gray-900">{coupons.length - activeCoupons.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">All Coupons</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Code</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Value</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Min Purchase</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Usage</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Valid Period</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Loading coupons...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-500">No coupons yet. Click &quot;Create Coupon&quot; to add one.</td></tr>
              ) : (
                coupons.map((coupon) => {
                  const status = couponStatus(coupon);
                  return (
                    <tr key={coupon.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">{coupon.code}</span>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors cursor-pointer"
                            title="Copy code"
                          >
                            <i className="ri-file-copy-line"></i>
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-700">{TYPE_LABELS[coupon.type] || coupon.type}</td>
                      <td className="py-4 px-4 font-semibold text-gray-900">{formatValue(coupon)}</td>
                      <td className="py-4 px-4 text-gray-700 whitespace-nowrap">
                        {coupon.minimum_purchase && coupon.minimum_purchase > 0 ? `₵ ${Number(coupon.minimum_purchase).toFixed(2)}` : 'No minimum'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 font-semibold">{coupon.usage_count || 0}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-gray-600">{coupon.usage_limit || '∞'}</span>
                        </div>
                        {coupon.usage_limit && (
                          <div className="w-24 h-2 bg-gray-200 rounded-full mt-2">
                            <div
                              className="h-full bg-gray-700 rounded-full"
                              style={{ width: `${Math.min(((coupon.usage_count || 0) / coupon.usage_limit) * 100, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-700 whitespace-nowrap">{coupon.start_date ? new Date(coupon.start_date).toLocaleDateString() : 'Anytime'}</p>
                        <p className="text-sm text-gray-500 whitespace-nowrap">{coupon.end_date ? new Date(coupon.end_date).toLocaleDateString() : 'No expiry'}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status] || 'bg-gray-100'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEdit(coupon)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <i className="ri-edit-line text-lg"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <i className="ri-delete-bin-line text-lg"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 10% off your first order"
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 cursor-pointer"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount (₵)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    {form.type === 'percentage' ? 'Percentage' : 'Amount (₵)'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    disabled={form.type === 'free_shipping'}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type === 'percentage' ? '10' : '50'}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Min Purchase (₵)</label>
                  <input
                    type="number"
                    value={form.minimum_purchase}
                    onChange={(e) => setForm({ ...form, minimum_purchase: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Max Discount (₵)</label>
                  <input
                    type="number"
                    value={form.maximum_discount}
                    disabled={form.type !== 'percentage'}
                    onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={form.usage_limit}
                    onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Per-User Limit</label>
                  <input
                    type="number"
                    value={form.per_user_limit}
                    onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
                    placeholder="1"
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-gray-900">Active</span>
              </label>

              {formError && (
                <p className="text-sm text-red-600 flex items-center">
                  <i className="ri-error-warning-line mr-1"></i>
                  {formError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white rounded-lg font-semibold"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
