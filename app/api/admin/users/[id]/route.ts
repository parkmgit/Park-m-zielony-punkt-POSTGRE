import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-config';
import { getCurrentUser } from '@/lib/auth-config';

export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const me = await getCurrentUser();
    if (!me || me.role !== 'admin') {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const userId = parseInt(params.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Nieprawidłowe ID' }, { status: 400 });
    }
    if (userId === me.id) {
      return NextResponse.json({ error: 'Nie możesz usunąć własnego konta' }, { status: 400 });
    }

    const target = await query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (target.length === 0) {
      return NextResponse.json({ error: 'Użytkownik nie istnieje' }, { status: 404 });
    }

    // Reassign all data from deleted user to the admin performing the deletion
    await query('UPDATE trees SET created_by = $1 WHERE created_by = $2', [me.id, userId]);
    await query('UPDATE trees SET worker_id = NULL WHERE worker_id = $1', [userId]);
    await query('UPDATE tree_actions SET performed_by = $1 WHERE performed_by = $2', [me.id, userId]);
    await query('UPDATE photos SET taken_by = $1 WHERE taken_by = $2', [me.id, userId]);
    await query('UPDATE watering_reminders SET assigned_user_id = $1 WHERE assigned_user_id = $2', [me.id, userId]);
    await query('UPDATE watering_reminders SET created_by = $1 WHERE created_by = $2', [me.id, userId]);

    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({ success: true, message: `Użytkownik "${target[0].name}" usunięty` });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Błąd usuwania użytkownika', details: error.message }, { status: 500 });
  }
}
