/**
 * Create an admin user in plain Postgres (auth.users + profiles).
 * Run: node scripts/create-admin.mjs
 *
 * Requires .env.local:
 *   DATABASE_URL
 *   ADMIN_PASSWORD
 * Optional:
 *   ADMIN_EMAIL (default admin@example.com)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) {
    console.error('Missing .env.local. Copy .env.example and set DATABASE_URL + ADMIN_PASSWORD.');
    process.exit(1);
  }
  const content = readFileSync(path, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv();
const databaseUrl = env.DATABASE_URL || env.POSTGRES_URL;
const adminEmail = (env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
const adminPassword = env.ADMIN_PASSWORD;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in .env.local');
  process.exit(1);
}
if (!adminPassword) {
  console.error('Missing ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT id FROM auth.users WHERE lower(email) = $1 AND deleted_at IS NULL LIMIT 1`,
      [adminEmail]
    );

    let userId;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      const hash = bcrypt.hashSync(adminPassword, 10);
      await client.query(
        `UPDATE auth.users SET encrypted_password = $1, updated_at = now(), email_confirmed_at = COALESCE(email_confirmed_at, now()) WHERE id = $2`,
        [hash, userId]
      );
      console.log('Updated password for existing user:', adminEmail);
    } else {
      userId = randomUUID();
      const hash = bcrypt.hashSync(adminPassword, 10);
      await client.query(
        `INSERT INTO auth.users (
           id, instance_id, aud, role, email, encrypted_password,
           email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
           created_at, updated_at, confirmation_token, recovery_token,
           email_change_token_new, email_change
         ) VALUES (
           $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           $2, $3, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
           now(), now(), '', '', '', ''
         )`,
        [userId, adminEmail, hash]
      );
      console.log('Created auth.users row:', adminEmail);
    }

    await client.query(
      `INSERT INTO profiles (id, email, role, full_name, created_at, updated_at)
       VALUES ($1, $2, 'admin', $3, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         role = 'admin',
         email = EXCLUDED.email,
         updated_at = now()`,
      [userId, adminEmail, adminEmail.split('@')[0]]
    );

    console.log('Admin profile ready.');
    console.log('Email:', adminEmail);
    console.log('Log in at: /admin/login');
    console.log('Password is the ADMIN_PASSWORD from .env.local (not printed).');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
