'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { BRAND } from '@/lib/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { getToken, verifying } = useRecaptcha();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      setIsLoading(false);
      return;
    }

    // reCAPTCHA verification
    const isHuman = await getToken('forgot_password');
    if (!isHuman) {
      setError('Security verification failed. Please try again.');
      setIsLoading(false);
      return;
    }

    // Email-based recovery is not wired on the plain-Postgres auth shim.
    setIsLoading(false);
    setError(
      'Self-serve password reset is not available yet. Please contact the store (WhatsApp or phone) and we will reset your account.'
    );
  };

  if (isSubmitted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-5">
            <img src="/logo.png" alt={BRAND.name} className="h-10 mx-auto" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-gray-600 ${
                  error ? 'border-[#FF6666]' : 'border-gray-300'
                }`}
                placeholder="you@example.com"
              />
              {error && (
                <p className="text-sm text-[#9A1900] mt-2">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || verifying}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isLoading || verifying ? (verifying ? 'Verifying...' : 'Sending...') : 'Send Reset Link'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-gray-900 hover:text-gray-900 font-semibold whitespace-nowrap">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium whitespace-nowrap">
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
