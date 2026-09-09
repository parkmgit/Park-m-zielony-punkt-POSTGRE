import { NextResponse } from 'next/server';
import { query } from '@/lib/db-config';
import { getCurrentUser } from '@/lib/auth-config';

export const runtime = 'nodejs';

const DEMO_NAMES = ['Anna Nowak', 'Piotr Wiśniewski', 'Jan Kowalski'];

export async function POST() {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const deleted: string[] = [];

    for (const name of DEMO_NAMES) {
      const users = await query<{ id: number; name: string }>(
        `SELECT id, name FROM users WHERE name = $1 AND role != 'admin'`,
        [name]
      );

      for (const u of users) {
        if (u.id === me.id) continue;

        await query('UPDATE trees SET created_by = $1 WHERE created_by = $2', [me.id, u.id]);
        await query('UPDATE trees SET worker_id = NULL WHERE worker_id = $1', [u.id]);
        await query('UPDATE tree_actions SET performed_by = $1 WHERE performed_by = $2', [me.id, u.id]);
        await query('UPDATE photos SET taken_by = $1 WHERE taken_by = $2', [me.id, u.id]);
        await query('UPDATE watering_reminders SET assigned_user_id = $1 WHERE assigned_user_id = $2', [me.id, u.id]);
        await query('UPDATE watering_reminders SET created_by = $1 WHERE created_by = $2', [me.id, u.id]);
        await query('DELETE FROM users WHERE id = $1', [u.id]);

        deleted.push(u.name);
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      message: deleted.length > 0
        ? `Usunięto ${deleted.length} użytkownik(ów): ${deleted.join(', ')}`
        : 'Nie znaleziono użytkowników demo (już usunięci?)'
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
