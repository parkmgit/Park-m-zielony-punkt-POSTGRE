import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { initDB } from '@/lib/db-config';

export const runtime = 'nodejs';

function hasValidSetupToken(request: NextRequest) {
  const expectedToken = process.env.SETUP_TOKEN;
  const providedToken = request.headers.get('x-setup-token');
  if (!expectedToken || !providedToken) return false;

  const expected = Buffer.from(expectedToken);
  const provided = Buffer.from(providedToken);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function POST(request: NextRequest) {
  if (!hasValidSetupToken(request)) {
    const auth = await requireRole('admin');
    if (!auth.ok) return auth.response;
  }

  try {
    await initDB();
    return NextResponse.json({ success: true, message: 'Baza danych została zainicjalizowana' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Nie udało się zainicjalizować bazy danych' },
      { status: 500 }
    );
  }
}
