'use client';

import Link from 'next/link';

/**
 * Phone OTP verification is not implemented on the plain-Postgres auth stack.
 * This page intentionally does not fake success.
 */
export default function VerifyPhonePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-[#1e40af] rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="ri-phone-line text-3xl text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-gray-900">Phone verification unavailable</h1>
          <p className="text-gray-600 text-sm mb-6">
            SMS OTP verification is not enabled for this store yet. You can continue shopping
            and manage your account without verifying a phone number.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/account"
              className="inline-block bg-[#1e40af] hover:bg-[#1d4ed8] text-white px-6 py-3 rounded-lg font-semibold"
            >
              Back to account
            </Link>
            <Link href="/contact" className="text-sm text-[#2563eb] hover:underline">
              Contact the store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
