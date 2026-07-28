import { isPlainPostgres } from './db/mode';
import { createClient as createPgClient, type SupabaseCompatClient } from './db/supabase-compat';

/**
 * Server-side admin client (plain Postgres compat).
 * ONLY use in API routes / server actions — never in client components.
 * Lazy so `next build` succeeds before DATABASE_URL is configured.
 */

let _client: SupabaseCompatClient | null = null;

export function getSupabaseAdmin(): SupabaseCompatClient {
  if (_client) return _client;
  if (!isPlainPostgres()) {
    throw new Error(
      'Plain Postgres mode required: set DATABASE_URL (or POSTGRES_URL) for server-side supabaseAdmin.'
    );
  }
  _client = createPgClient();
  return _client;
}

export const supabaseAdmin: SupabaseCompatClient = new Proxy({} as SupabaseCompatClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
