/**
 * Validate Moolre webhook authenticity.
 * Query-string secrets are often stripped by gateways/proxies — also accept
 * path segment and headers.
 */
export function extractMoolreCallbackSecret(req: Request, pathSecret?: string): string {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('s') || '';
  const fromHeader =
    req.headers.get('x-moolre-callback-secret') ||
    req.headers.get('x-callback-secret') ||
    '';
  const auth = req.headers.get('authorization') || '';
  const fromBearer = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  return (pathSecret || fromQuery || fromHeader || fromBearer || '').trim();
}

export function isValidMoolreCallbackSecret(provided: string): boolean {
  const expected = (process.env.MOOLRE_CALLBACK_SECRET || '').trim();
  if (!expected) return false;
  if (!provided) return false;
  // Constant-time-ish compare for equal-length strings
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Preferred callback URL — secret in path so proxies can't strip it. */
export function buildMoolreCallbackUrl(baseUrl: string): string | null {
  const secret = (process.env.MOOLRE_CALLBACK_SECRET || '').trim();
  if (!secret) return null;
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/api/payment/moolre/hook/${encodeURIComponent(secret)}`;
}
