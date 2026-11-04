import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { query } from '@/lib/db-config';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    return NextResponse.json(
      { error: 'Reset bazy danych jest wyłączony' },
      { status: 403 }
    );
  }

  try {
    await query(`
      DROP TABLE IF EXISTS
        photos,
        watering_reminders,
        shrub_actions,
        tree_actions,
        shrubs,
        trees,
        sync_queue,
        species,
        sites,
        projects,
        users
    `);

    return NextResponse.json({
      success: true,
      message: 'Baza danych została wyczyszczona',
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Nie udało się wyczyścić bazy danych' },
      { status: 500 }
    );
  }
}
