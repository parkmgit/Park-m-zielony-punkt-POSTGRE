import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { query, withTransaction } from '@/lib/db-config';
import { hashPassword, validatePassword } from '@/lib/password';
import type { UserRole } from '@/lib/auth';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface TargetUser {
  id: number;
  name: string;
  role: UserRole;
  active: boolean;
}

const USER_ROLES: UserRole[] = ['admin', 'brygadzista', 'pracownik'];
const ROLE_CHANGE_LOCK_ID = 9102026;

function parseUserId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const userId = parseUserId(id);
    if (!userId) {
      return NextResponse.json({ error: 'Nieprawidłowe ID użytkownika' }, { status: 400 });
    }

    const body = await request.json();
    const changesPassword = body?.password !== undefined;
    const changesRole = body?.role !== undefined;

    if (changesPassword === changesRole) {
      return NextResponse.json(
        { error: 'Podaj dokładnie jedną zmianę: hasło albo rolę' },
        { status: 400 }
      );
    }

    if (changesRole) {
      if (!USER_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Nieprawidłowa rola użytkownika' }, { status: 400 });
      }

      const newRole = body.role as UserRole;
      const result = await withTransaction(async client => {
        // Serializuje zmiany ról, aby dwie równoległe operacje nie usunęły ostatniego admina.
        await client.query('SELECT pg_advisory_xact_lock($1)', [ROLE_CHANGE_LOCK_ID]);

        const targetResult = await client.query<TargetUser>(
          'SELECT id, name, role, active FROM users WHERE id = $1 FOR UPDATE',
          [userId]
        );
        const target = targetResult.rows[0];
        if (!target) return { status: 'not-found' as const };

        if (target.role === 'admin' && target.active && newRole !== 'admin') {
          const adminCountResult = await client.query<{ count: number }>(
            `SELECT COUNT(*)::int AS count
             FROM users
             WHERE role = 'admin' AND active = true`
          );

          if (adminCountResult.rows[0].count <= 1) {
            return { status: 'last-admin' as const };
          }
        }

        await client.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);
        return { status: 'updated' as const, target };
      });

      if (result.status === 'not-found') {
        return NextResponse.json({ error: 'Użytkownik nie istnieje' }, { status: 404 });
      }
      if (result.status === 'last-admin') {
        return NextResponse.json(
          { error: 'Nie można zmienić roli ostatniego aktywnego administratora' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        role: newRole,
        message: `Rola użytkownika „${result.target.name}” została zmieniona`,
      });
    }

    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const target = await query<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );
    if (target.length === 0) {
      return NextResponse.json({ error: 'Użytkownik nie istnieje' }, { status: 404 });
    }

    const passwordHash = await hashPassword(body.password);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    return NextResponse.json({
      success: true,
      message: `Hasło użytkownika „${target[0].name}” zostało zmienione`,
    });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json(
      { error: 'Nie udało się zaktualizować użytkownika' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const userId = parseUserId(id);
    if (!userId) {
      return NextResponse.json({ error: 'Nieprawidłowe ID użytkownika' }, { status: 400 });
    }
    if (userId === auth.user.id) {
      return NextResponse.json({ error: 'Nie możesz usunąć własnego konta' }, { status: 400 });
    }

    const target = await query<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );
    if (target.length === 0) {
      return NextResponse.json({ error: 'Użytkownik nie istnieje' }, { status: 404 });
    }

    // Zachowaj dane operacyjne, przepinając wymagane relacje na administratora.
    await query('UPDATE trees SET created_by = $1 WHERE created_by = $2', [auth.user.id, userId]);
    await query('UPDATE trees SET worker_id = NULL WHERE worker_id = $1', [userId]);
    await query('UPDATE tree_actions SET performed_by = $1 WHERE performed_by = $2', [auth.user.id, userId]);
    await query('UPDATE photos SET taken_by = $1 WHERE taken_by = $2', [auth.user.id, userId]);
    await query('UPDATE watering_reminders SET assigned_user_id = $1 WHERE assigned_user_id = $2', [auth.user.id, userId]);
    await query('UPDATE watering_reminders SET created_by = $1 WHERE created_by = $2', [auth.user.id, userId]);
    await query('UPDATE shrubs SET created_by = $1 WHERE created_by = $2', [auth.user.id, userId]);
    await query('UPDATE shrubs SET worker_id = NULL WHERE worker_id = $1', [userId]);
    await query('UPDATE shrub_actions SET performer_id = $1 WHERE performer_id = $2', [auth.user.id, userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);

    return NextResponse.json({
      success: true,
      message: `Użytkownik „${target[0].name}” został usunięty`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Nie udało się usunąć użytkownika' },
      { status: 500 }
    );
  }
}
