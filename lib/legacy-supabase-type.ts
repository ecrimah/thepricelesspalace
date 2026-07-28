/** Loose client surface matching legacy @supabase/supabase-js usage in this app. */

export type LegacyQueryResult = { data: any; error: any; count?: number | null };

export type LegacyQueryBuilder = {
  select: (...args: any[]) => LegacyQueryBuilder;
  insert: (...args: any[]) => LegacyQueryBuilder;
  update: (...args: any[]) => LegacyQueryBuilder;
  upsert: (...args: any[]) => LegacyQueryBuilder;
  delete: () => LegacyQueryBuilder;
  eq: (...args: any[]) => LegacyQueryBuilder;
  neq: (...args: any[]) => LegacyQueryBuilder;
  gt: (...args: any[]) => LegacyQueryBuilder;
  gte: (...args: any[]) => LegacyQueryBuilder;
  lt: (...args: any[]) => LegacyQueryBuilder;
  lte: (...args: any[]) => LegacyQueryBuilder;
  like: (...args: any[]) => LegacyQueryBuilder;
  ilike: (...args: any[]) => LegacyQueryBuilder;
  is: (...args: any[]) => LegacyQueryBuilder;
  in: (...args: any[]) => LegacyQueryBuilder;
  or: (...args: any[]) => LegacyQueryBuilder;
  not: (...args: any[]) => LegacyQueryBuilder;
  filter: (...args: any[]) => LegacyQueryBuilder;
  order: (...args: any[]) => LegacyQueryBuilder;
  limit: (...args: any[]) => LegacyQueryBuilder;
  range: (...args: any[]) => LegacyQueryBuilder;
  single: () => LegacyQueryBuilder;
  maybeSingle: () => LegacyQueryBuilder;
} & PromiseLike<LegacyQueryResult>;

export type LegacySupabaseClient = {
  from: (table: string) => LegacyQueryBuilder;
  auth: {
    signInWithPassword: (c: {
      email: string;
      password: string;
    }) => Promise<{ data: { user: any; session: any }; error: any }>;
    signUp: (o: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) => Promise<{ data: { user: any; session: any }; error: any }>;
    signOut: () => Promise<{ error: any }>;
    getSession: () => Promise<{ data: { session: any }; error: any }>;
    getUser: (jwt?: string) => Promise<{ data: { user: any }; error: any }>;
    updateUser: (attrs: {
      password?: string;
      data?: Record<string, unknown>;
    }) => Promise<{ data: { user: any }; error: any }>;
    onAuthStateChange: (
      cb: (event: string, session: any) => void
    ) => { data: { subscription: { unsubscribe: () => void } } };
  };
  storage: {
    from: (bucket: string) => {
      upload: (...args: any[]) => Promise<{ data: any; error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
      createSignedUrl: (...args: any[]) => Promise<{ data: any; error: any }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};
