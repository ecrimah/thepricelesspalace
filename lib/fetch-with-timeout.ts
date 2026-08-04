/**
 * fetch() wrapper with AbortSignal timeout.
 * Prevents endless pending requests that freeze loading spinners.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000
): Promise<Response> {
  const timeoutSignal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

  if (!timeoutSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // Merge with caller signal if present
  const caller = init.signal;
  if (!caller) {
    return fetch(input, { ...init, signal: timeoutSignal });
  }

  const merged = new AbortController();
  const onAbort = () => merged.abort();
  caller.addEventListener('abort', onAbort);
  timeoutSignal.addEventListener('abort', onAbort);
  if (caller.aborted || timeoutSignal.aborted) merged.abort();

  try {
    return await fetch(input, { ...init, signal: merged.signal });
  } finally {
    caller.removeEventListener('abort', onAbort);
    timeoutSignal.removeEventListener('abort', onAbort);
  }
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'AbortError' || name === 'TimeoutError';
}
