import { createHttpClient } from './db/http-client';
import type { LegacySupabaseClient } from './legacy-supabase-type';

/** Browser / shared client — talks to this app's /rest /auth /storage shims. */
export const supabase: LegacySupabaseClient = createHttpClient() as LegacySupabaseClient;
