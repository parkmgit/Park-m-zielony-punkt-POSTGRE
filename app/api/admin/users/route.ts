import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { query } from '@/lib/db-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AdminUserRow {
  id: number;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  created_at: string;
  last_seen_at: string | null;
  has_password: boolean;
}

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const users = await query<AdminUserRow>(`
      SELECT
        id,
        name,
        email,
        role,
        active,
        created_at,
        last_seen_at,
        (password_hash IS NOT NULL) AS has_password
      FROM users
      ORDER BY active DESC, name ASC
    `);

    return NextResponse.json(
      { users, currentUserId: auth.user.id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać użytkowników' },
      { status: 500 }
    );
  }
}
