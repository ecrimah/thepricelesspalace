import { NextResponse } from 'next/server';
import { handleMoolreCallback } from '@/lib/moolre-callback-handler';

/**
 * Legacy Moolre webhook URL (secret via ?s=...).
 * Prefer /api/payment/moolre/hook/[secret] — query params are often stripped.
 */
export async function POST(req: Request) {
  return handleMoolreCallback(req);
}

export async function GET() {
  return NextResponse.json({
    message: 'Moolre callback endpoint ready',
    preferred: '/api/payment/moolre/hook/<MOOLRE_CALLBACK_SECRET>',
    timestamp: new Date().toISOString(),
  });
}
