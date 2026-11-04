import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-config';
import { query } from '@/lib/db-config';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Nie zalogowano' },
        { status: 401 }
      );
    }

    // Aktualizuj ostatnią aktywność (kolumna jest częścią bazowego schematu).
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
