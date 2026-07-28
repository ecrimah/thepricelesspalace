import fs from 'fs';

const src = fs.readFileSync('supabase/migrations/20260209000000_complete_schema.sql', 'utf8');
let s = src;

const header = `-- Palace plain Postgres schema (Shape A)
-- Derived from supabase/migrations/20260209000000_complete_schema.sql
-- auth.users kept for GoTrue-compatible local auth shim (lib/db/auth.ts)
-- RLS policies removed; authorize in API / JWT claims.

`;

s = s.replace(
  /CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;/g,
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
);

const authUsers = `
-- ============================================================================
-- AUTH SCHEMA (local GoTrue-compatible)
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  aud text,
  role text,
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text DEFAULT '',
  confirmation_sent_at timestamptz,
  recovery_token text DEFAULT '',
  recovery_sent_at timestamptz,
  email_change_token_new text DEFAULT '',
  email_change text DEFAULT '',
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text DEFAULT NULL,
  phone_confirmed_at timestamptz,
  phone_change text DEFAULT '',
  phone_change_token text DEFAULT '',
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  email_change_token_current text DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token text DEFAULT '',
  reauthentication_sent_at timestamptz,
  is_sso_user boolean NOT NULL DEFAULT false,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (lower(email));

`;

// Insert auth schema after extensions (CRLF-safe)
const extMarker = 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";';
if (s.includes(extMarker)) {
  s = s.replace(extMarker, `${extMarker}\n${authUsers}`);
} else {
  s = authUsers + s;
}

s = s.replace(
  /CREATE OR REPLACE FUNCTION public\.is_admin_or_staff\(\)[\s\S]*?\$\$;/m,
  `CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Unused without RLS; kept for SQL compatibility.
  RETURN false;
END;
$$;`
);

s = s.replace(/^ALTER TABLE .* ENABLE ROW LEVEL SECURITY;\s*\r?$/gm, '');
s = s.replace(/^-- \d+\. ENABLE ROW LEVEL SECURITY\s*\r?$/gm, '-- RLS removed for plain Postgres');
s = s.replace(/^CREATE POLICY[\s\S]*?;\s*\r?$/gm, '');
s = s.replace(/^GRANT .* TO (anon|authenticated|service_role);\s*\r?$/gm, '');
s = s.replace(/^REVOKE .* FROM (anon|authenticated|service_role);\s*\r?$/gm, '');

// Remove storage.buckets inserts if they reference supabase storage schema without creating it
// Keep them only if storage schema exists — strip storage bucket seeds for plain PG
s = s.replace(/INSERT INTO storage\.buckets[\s\S]*?;\s*/gi, '-- storage.buckets seed removed (disk STORAGE_ROOT)\n');
s = s.replace(/CREATE POLICY[\s\S]*?ON storage\.[\s\S]*?;\s*/gi, '');

fs.mkdirSync('db/migrations', { recursive: true });
const out = header + s;
fs.writeFileSync('db/migrations/001_plain_postgres.sql', out);

const uuidDefaults = `-- Plain Postgres cutover: ensure UUID id defaults (playbook §1a)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.is_nullable = 'NO'
      AND c.column_default IS NULL
      AND c.data_type = 'uuid'
      AND t.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
      r.table_name
    );
  END LOOP;
END $$;
`;
fs.writeFileSync('db/migrations/002_uuid_id_defaults.sql', uuidDefaults);

console.log('Wrote db/migrations/001_plain_postgres.sql', out.length, 'bytes');
console.log('CREATE POLICY left:', (out.match(/CREATE POLICY/g) || []).length);
console.log('ENABLE RLS left:', (out.match(/ENABLE ROW LEVEL SECURITY/g) || []).length);
console.log('auth.users present:', out.includes('CREATE TABLE IF NOT EXISTS auth.users'));
