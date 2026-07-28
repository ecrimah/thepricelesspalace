import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/admin/me
 * Returns current admin/staff user and profile using the caller session token.
 */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return NextResponse.json(
      { error: 'Server misconfiguration: missing database env vars' },
      { status: 503 }
    );
  }

  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const role = profile.role != null ? String(profile.role) : '';
  if (role !== 'admin' && role !== 'staff') {
    return NextResponse.json({ error: 'Not admin or staff' }, { status: 403 });
  }

  const { data: roleConfig } = await supabaseAdmin
    .from('roles')
    .select('permissions, enabled')
    .eq('id', role)
    .single();

  if (roleConfig && !roleConfig.enabled) {
    return NextResponse.json({ error: 'Role disabled' }, { status: 403 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile: { role },
    permissions: roleConfig?.permissions ?? {},
  });
}
