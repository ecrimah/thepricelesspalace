import { NextResponse } from 'next/server';
import { handleMoolreCallback } from '@/lib/moolre-callback-handler';

type Ctx = { params: Promise<{ secret: string }> };

/**
 * Preferred Moolre webhook URL — secret is in the path so CDNs/proxies
 * cannot strip it the way they strip query strings.
 */
export async function POST(req: Request, context: Ctx) {
  const { secret } = await context.params;
  return handleMoolreCallback(req, decodeURIComponent(secret || ''));
}

export async function GET(_req: Request, context: Ctx) {
  const { secret } = await context.params;
  return NextResponse.json({
    message: 'Moolre hook endpoint ready',
    hasSecret: Boolean(secret),
    timestamp: new Date().toISOString(),
  });
}
