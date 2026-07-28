/**
 * Browser / SSR-friendly Supabase-shaped client over same-origin shims:
 *   /rest/v1/*  /auth/v1/*  /storage/v1/*
 */

type Row = Record<string, unknown>;
type QueryResult = {
  data: any;
  error: { message: string } | null;
  count: number | null;
};
type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email: string | null;
    phone?: string | null;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
};

type AuthChangeCallback = (event: string, session: Session | null) => void;

const SESSION_KEY = 'palace-http-auth-session';

function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ||
    ''
  );
}

function resolveAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || 'local-anon-key';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function loadStoredSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Session;
      if (parsed?.access_token) return parsed;
    }
  } catch {
    /* ignore */
  }
  const token = readCookie('sb-access-token');
  if (!token) return null;
  return {
    access_token: token,
    refresh_token: '',
    expires_in: 0,
    expires_at: 0,
    token_type: 'bearer',
    user: { id: '', email: null },
  };
}

function persistSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
  }
}

let cachedSession: Session | null = null;
const authListeners = new Set<AuthChangeCallback>();

function notifyAuth(event: string, session: Session | null) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch {
      /* ignore listener errors */
    }
  }
}

function getAccessToken(): string | null {
  const session = cachedSession ?? loadStoredSession();
  return session?.access_token ?? null;
}

function apiHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  const key = resolveAnonKey();
  h.set('apikey', key);
  if (!h.has('Content-Type')) h.set('Content-Type', 'application/json');
  const token = getAccessToken();
  if (token) h.set('Authorization', `Bearer ${token}`);
  else h.set('Authorization', `Bearer ${key}`);
  return h;
}

async function parseJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'number') return String(v);
  const s = String(v);
  if (/^[a-zA-Z0-9._-]+$/.test(s)) return s;
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function formatCmp(op: string, value: unknown): string {
  if (op === 'in' && Array.isArray(value)) {
    return `in.(${value.map(formatScalar).join(',')})`;
  }
  if (op === 'is') {
    if (value === null || value === 'null') return 'is.null';
    return `is.${formatScalar(value)}`;
  }
  return `${op}.${formatScalar(value)}`;
}

type FilterEntry =
  | { kind: 'cmp'; col: string; op: string; value: unknown }
  | { kind: 'or'; parts: string }
  | { kind: 'notIn'; col: string; value: string }
  | { kind: 'notIs'; col: string; value: unknown };

class HttpQueryBuilder implements PromiseLike<QueryResult> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private selectStr = '*';
  private wantCount = false;
  private headOnly = false;
  private filters: FilterEntry[] = [];
  private orders: { col: string; ascending: boolean; nullsFirst?: boolean }[] = [];
  private limitN: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private payload: Row | Row[] | null = null;
  private onConflict: string | null = null;
  private returnRows = false;
  private singleMode: 'none' | 'single' | 'maybe' = 'none';

  constructor(table: string) {
    this.table = table;
  }

  select(sel = '*', opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    if (this.action === 'select') {
      this.selectStr = sel || '*';
    } else {
      this.returnRows = true;
      this.selectStr = sel || '*';
    }
    if (opts?.count) this.wantCount = true;
    if (opts?.head) {
      this.headOnly = true;
      this.wantCount = true;
    }
    return this;
  }

  insert(payload: Row | Row[]) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }
  update(patch: Row) {
    this.action = 'update';
    this.payload = patch;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.action = 'upsert';
    this.payload = payload;
    this.onConflict = opts?.onConflict ?? null;
    return this;
  }
  delete() {
    this.action = 'delete';
    return this;
  }

  eq(col: string, value: unknown) {
    return this.cmp(col, 'eq', value);
  }
  neq(col: string, value: unknown) {
    return this.cmp(col, 'neq', value);
  }
  gt(col: string, value: unknown) {
    return this.cmp(col, 'gt', value);
  }
  gte(col: string, value: unknown) {
    return this.cmp(col, 'gte', value);
  }
  lt(col: string, value: unknown) {
    return this.cmp(col, 'lt', value);
  }
  lte(col: string, value: unknown) {
    return this.cmp(col, 'lte', value);
  }
  like(col: string, value: unknown) {
    return this.cmp(col, 'like', value);
  }
  ilike(col: string, value: unknown) {
    return this.cmp(col, 'ilike', value);
  }
  is(col: string, value: unknown) {
    this.filters.push({ kind: 'cmp', col, op: 'is', value });
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push({ kind: 'cmp', col, op: 'in', value: values });
    return this;
  }
  or(parts: string) {
    this.filters.push({ kind: 'or', parts });
    return this;
  }
  not(col: string, op: string, value: unknown) {
    if (op === 'in') this.filters.push({ kind: 'notIn', col, value: String(value) });
    else if (op === 'is') this.filters.push({ kind: 'notIs', col, value });
    else this.filters.push({ kind: 'cmp', col, op: `not.${op}`, value });
    return this;
  }
  filter(col: string, op: string, value: unknown) {
    if (op === 'in') {
      const raw = String(value).replace(/^\(|\)$/g, '');
      const vals = raw.split(',').map((s) => s.trim());
      this.filters.push({ kind: 'cmp', col, op: 'in', value: vals });
    } else if (op === 'is') {
      this.filters.push({ kind: 'cmp', col, op: 'is', value: value === 'null' ? null : value });
    } else {
      this.filters.push({ kind: 'cmp', col, op, value });
    }
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({
      col,
      ascending: opts?.ascending !== false,
      nullsFirst: opts?.nullsFirst,
    });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }
  single() {
    this.singleMode = 'single';
    this.returnRows = true;
    return this;
  }
  maybeSingle() {
    this.singleMode = 'maybe';
    this.returnRows = true;
    return this;
  }

  private cmp(col: string, op: string, value: unknown) {
    this.filters.push({ kind: 'cmp', col, op, value });
    return this;
  }

  private buildSearchParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.action === 'select' || this.returnRows) {
      params.set('select', this.selectStr);
    }
    for (const f of this.filters) {
      if (f.kind === 'or') {
        const inner = f.parts.startsWith('(') ? f.parts : `(${f.parts})`;
        params.set('or', inner);
      } else if (f.kind === 'notIn') {
        const raw = f.value.replace(/^\(|\)$/g, '').trim();
        params.set(f.col, `not.in.(${raw})`);
      } else if (f.kind === 'notIs') {
        const v = f.value === null || f.value === 'null' ? 'null' : formatScalar(f.value);
        params.set(f.col, `not.is.${v}`);
      } else if (f.kind === 'cmp') {
        const op = f.op.startsWith('not.') ? f.op : f.op;
        if (op.startsWith('not.')) {
          const bare = op.slice(4);
          params.set(f.col, `not.${formatCmp(bare, f.value)}`);
        } else {
          params.set(f.col, formatCmp(f.op, f.value));
        }
      }
    }
    if (this.orders.length) {
      params.set(
        'order',
        this.orders
          .map((o) => {
            let s = `${o.col}.${o.ascending ? 'asc' : 'desc'}`;
            if (o.nullsFirst) s += '.nullsfirst';
            return s;
          })
          .join(',')
      );
    }
    if (this.limitN != null) params.set('limit', String(this.limitN));
    if (this.rangeFrom != null && this.rangeTo != null) {
      params.set('offset', String(this.rangeFrom));
      params.set('limit', String(this.rangeTo - this.rangeFrom + 1));
    }
    return params;
  }

  private async run(): Promise<QueryResult> {
    const base = resolveBaseUrl();
    const params = this.buildSearchParams();
    const headers = apiHeaders();

    if (this.wantCount) headers.set('Prefer', 'count=exact');
    if (this.headOnly) headers.set('Prefer', 'count=exact, head=true');

    if (this.singleMode !== 'none') {
      headers.set('Accept', 'application/vnd.pgrst.object+json');
    }

    try {
      if (this.action === 'select') {
        const url = `${base}/rest/v1/${encodeURIComponent(this.table)}?${params}`;
        const res = await fetch(url, { method: 'GET', headers });
        return this.parseRestResponse(res);
      }

      if (this.action === 'insert' || this.action === 'upsert') {
        if (this.returnRows || this.singleMode !== 'none') {
          headers.set('Prefer', 'return=representation');
        }
        if (this.action === 'upsert') {
          const prefer = headers.get('Prefer') || '';
          headers.set(
            'Prefer',
            `${prefer}${prefer ? ', ' : ''}resolution=merge-duplicates${this.onConflict ? `, on_conflict=${this.onConflict}` : ''}`
          );
        }
        const url = `${base}/rest/v1/${encodeURIComponent(this.table)}?${params}`;
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(this.payload),
        });
        return this.parseRestResponse(res);
      }

      if (this.action === 'update') {
        if (this.returnRows || this.singleMode !== 'none') {
          headers.set('Prefer', 'return=representation');
        }
        const url = `${base}/rest/v1/${encodeURIComponent(this.table)}?${params}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(this.payload),
        });
        return this.parseRestResponse(res);
      }

      if (this.action === 'delete') {
        if (this.returnRows) headers.set('Prefer', 'return=representation');
        const url = `${base}/rest/v1/${encodeURIComponent(this.table)}?${params}`;
        const res = await fetch(url, { method: 'DELETE', headers });
        return this.parseRestResponse(res);
      }

      return { data: null, error: { message: 'Unknown action' }, count: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { data: null, error: { message: msg }, count: null };
    }
  }

  private async parseRestResponse(res: Response): Promise<QueryResult> {
    let count: number | null = null;
    const range = res.headers.get('content-range');
    if (range) {
      const parts = range.split('/');
      if (parts.length === 2 && parts[1] !== '*') count = Number(parts[1]);
    }

    const body = await parseJson(res);

    if (!res.ok) {
      const message =
        body?.message || body?.error_description || body?.msg || body?.error || res.statusText;
      return { data: null, error: { message: String(message) }, count };
    }

    if (this.headOnly) {
      return { data: null, error: null, count };
    }

    let data = body;

    if (this.singleMode === 'single') {
      if (data == null) {
        return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' }, count };
      }
    } else if (this.singleMode === 'maybe') {
      if (Array.isArray(data) && data.length === 0) data = null;
      else if (Array.isArray(data) && data.length === 1) data = data[0];
      else if (Array.isArray(data) && data.length > 1) {
        return { data: null, error: { message: 'JSON object requested, multiple rows returned' }, count };
      }
    }

    return { data, error: null, count };
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

function createAuthApi() {
  return {
    async signInWithPassword(creds: { email: string; password: string }) {
      const base = resolveBaseUrl();
      const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        return {
          data: { user: null, session: null },
          error: { message: body?.msg || body?.message || body?.error_description || 'Login failed' },
        };
      }
      const session: Session = {
        access_token: body.access_token,
        refresh_token: body.refresh_token,
        expires_in: body.expires_in,
        expires_at: body.expires_at,
        token_type: body.token_type || 'bearer',
        user: body.user,
      };
      cachedSession = session;
      persistSession(session);
      notifyAuth('SIGNED_IN', session);
      return {
        data: { user: body.user, session },
        error: null,
      };
    },

    async signUp(opts: {
      email: string;
      password: string;
      options?: { data?: Record<string, unknown> };
    }) {
      const base = resolveBaseUrl();
      const res = await fetch(`${base}/auth/v1/signup`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          email: opts.email,
          password: opts.password,
          data: opts.options?.data,
        }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        return {
          data: { user: null, session: null },
          error: { message: body?.msg || body?.message || 'Signup failed' },
        };
      }
      if (body.access_token) {
        const session: Session = {
          access_token: body.access_token,
          refresh_token: body.refresh_token,
          expires_in: body.expires_in,
          expires_at: body.expires_at,
          token_type: body.token_type || 'bearer',
          user: body.user,
        };
        cachedSession = session;
        persistSession(session);
        notifyAuth('SIGNED_IN', session);
        return { data: { user: body.user, session }, error: null };
      }
      return { data: { user: body.user ?? body, session: null }, error: null };
    },

    async signOut() {
      const base = resolveBaseUrl();
      try {
        await fetch(`${base}/auth/v1/logout`, { method: 'POST', headers: apiHeaders() });
      } catch {
        /* ignore */
      }
      cachedSession = null;
      persistSession(null);
      notifyAuth('SIGNED_OUT', null);
      return { error: null };
    },

    async getSession() {
      let session = cachedSession ?? loadStoredSession();
      if (!session?.access_token) {
        return { data: { session: null }, error: null };
      }
      if (session.user && Object.keys(session.user).length > 0) {
        cachedSession = session;
        return { data: { session }, error: null };
      }
      const base = resolveBaseUrl();
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: apiHeaders(new Headers({ Authorization: `Bearer ${session.access_token}` })),
      });
      if (!res.ok) {
        cachedSession = null;
        persistSession(null);
        return { data: { session: null }, error: null };
      }
      const user = await parseJson(res);
      session = { ...session, user };
      cachedSession = session;
      persistSession(session);
      return { data: { session }, error: null };
    },

    async getUser(jwt?: string) {
      const token = jwt || getAccessToken();
      if (!token) return { data: { user: null }, error: { message: 'No JWT provided' } };
      const base = resolveBaseUrl();
      const res = await fetch(`${base}/auth/v1/user`, {
        headers: apiHeaders(new Headers({ Authorization: `Bearer ${token}` })),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        return { data: { user: null }, error: { message: body?.msg || body?.message || 'Invalid JWT' } };
      }
      return { data: { user: body }, error: null };
    },

    async updateUser(attrs: { password?: string; data?: Record<string, unknown> }) {
      const session = cachedSession ?? loadStoredSession();
      if (!session?.access_token) {
        return { data: { user: null }, error: { message: 'Not authenticated' } };
      }
      const base = resolveBaseUrl();
      const payload: Record<string, unknown> = {};
      if (attrs.password) payload.password = attrs.password;
      if (attrs.data) payload.data = attrs.data;
      const res = await fetch(`${base}/auth/v1/user`, {
        method: 'PUT',
        headers: apiHeaders(new Headers({ Authorization: `Bearer ${session.access_token}` })),
        body: JSON.stringify(payload),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        return { data: { user: null }, error: { message: body?.msg || body?.message || 'Update failed' } };
      }
      const next = { ...session, user: body };
      cachedSession = next;
      persistSession(next);
      notifyAuth('USER_UPDATED', next);
      return { data: { user: body }, error: null };
    },

    onAuthStateChange(callback: AuthChangeCallback) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  };
}

function createStorageApi() {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: Blob | ArrayBuffer | File, _opts?: { upsert?: boolean }) {
          const base = resolveBaseUrl();
          const res = await fetch(
            `${base}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`,
            {
              method: 'POST',
              headers: apiHeaders(new Headers({ 'Content-Type': (file as File).type || 'application/octet-stream' })),
              body: file instanceof Blob ? file : new Blob([file]),
            }
          );
          const body = await parseJson(res);
          if (!res.ok) return { data: null, error: { message: body?.message || 'Upload failed' } };
          return { data: body, error: null };
        },
        getPublicUrl(path: string) {
          const base = resolveBaseUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
          return {
            data: { publicUrl: `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}` },
          };
        },
        createSignedUrl(_path: string, _expiresIn: number) {
          return Promise.resolve({
            data: null,
            error: { message: 'createSignedUrl: use /storage/v1/object/sign route' },
          });
        },
      };
    },
  };
}

export type HttpSupabaseClient = {
  from(table: string): HttpQueryBuilder;
  auth: ReturnType<typeof createAuthApi>;
  storage: ReturnType<typeof createStorageApi>;
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: any; error: any }>;
};

export function createHttpClient(_url?: string, _key?: string): HttpSupabaseClient {
  return {
    from(table: string) {
      return new HttpQueryBuilder(table);
    },
    auth: createAuthApi(),
    storage: createStorageApi(),
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      const base = resolveBaseUrl();
      const res = await fetch(`${base}/rest/v1/rpc/${encodeURIComponent(fn)}`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(args),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        return { data: null, error: { message: body?.message || 'RPC failed' } };
      }
      return { data: body, error: null };
    },
  };
}
