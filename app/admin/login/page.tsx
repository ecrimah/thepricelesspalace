'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { BRAND } from '@/lib/brand';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { getToken, verifying } = useRecaptcha();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'role_disabled') {
      setError('Your role has been disabled by the administrator. Contact your Super Admin for access.');
    } else if (errorParam === 'unauthorized') {
      setError('You do not have permission to access the admin panel.');
    } else if (errorParam === 'no_profile') {
      setError('No admin profile found. From project root run: node scripts/create-admin.mjs');
    } else if (errorParam === 'config') {
      setError('Server misconfiguration: DATABASE_URL is not set in .env.local. Add your Postgres connection string.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // reCAPTCHA verification
    const isHuman = await getToken('admin_login');
    if (!isHuman) {
      setError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        // Set auth cookie so middleware can verify the session server-side.
        // Omit Secure on HTTP (e.g. localhost) so the cookie is sent and middleware can validate.
        const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
        document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;

        // Full-page redirect so the first request to /admin includes the cookie (avoids RSC fetch race).
        window.location.href = '/admin';
      }
    } catch (err: any) {
      const msg = err?.message || 'Login failed';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_credentials')) {
        setError('Invalid email or password. Use the admin account from your .env.local (ADMIN_EMAIL / ADMIN_PASSWORD) or run: node scripts/create-admin.mjs');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-[#1e40af]">
      {/* Ambient brand glows */}
      <span aria-hidden="true" className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#2563eb]/20 blur-[120px]" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#93c5fd]/15 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-[26px] bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-[#2563eb]/30">
          {/* Gold top accent */}
          <span aria-hidden="true" className="block h-1 w-full bg-gradient-to-r from-[#2563eb] via-[#60a5fa] to-[#2563eb]" />

          <div className="p-8">
            <div className="text-center mb-7">
              <Link href="/" className="inline-block">
                <img
                  src="/logo.png"
                  alt={BRAND.name}
                  className="h-16 sm:h-20 w-auto object-contain mx-auto"
                />
              </Link>
              <h1 className="text-2xl font-bold text-[#1e40af] mt-5 mb-1.5">Admin Login</h1>
              <p className="text-sm text-gray-500">Sign in to manage {BRAND.name}</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                <i className="ri-error-warning-line text-red-600 text-xl mt-0.5"></i>
                <div>
                  <p className="text-red-800 font-semibold">Login Failed</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1e40af] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <i className="ri-mail-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl outline-none transition-colors focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1e40af] mb-2">
                  Password
                </label>
                <div className="relative">
                  <i className="ri-lock-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl outline-none transition-colors focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2563eb] w-5 h-5 flex items-center justify-center"
                  >
                    <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-lg`}></i>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || verifying}
                className="w-full bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white py-3 rounded-xl font-semibold shadow-[0_10px_26px_-12px_rgba(37,99,235,0.9)] hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading || verifying ? (
                  <span className="flex items-center justify-center space-x-2">
                    <i className="ri-loader-4-line animate-spin"></i>
                    <span>{verifying ? 'Verifying...' : 'Signing in...'}</span>
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#2563eb]/80 hover:text-[#60a5fa] transition-colors whitespace-nowrap">
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}
