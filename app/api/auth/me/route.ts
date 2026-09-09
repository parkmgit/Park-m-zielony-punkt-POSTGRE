import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-config';
import { query } from '@/lib/db-config';

export const runtime = 'nodejs';

// Jednorazowa migracja — bezpieczna dzięki IF NOT EXISTS
let migrationDone = false;
async function ensureLastSeenColumn() {
  if (migrationDone) return;
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP`);
    migrationDone = true;
  } catch {}
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Nie zalogowano' },
        { status: 401 }
      );
    }

    // Aktualizuj ostatnią aktywność (każde wejście do aplikacji)
    await ensureLastSeenColumn();
    query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Błąd pobierania danych użytkownika' },
      { status: 500 }
    );
  }
}
