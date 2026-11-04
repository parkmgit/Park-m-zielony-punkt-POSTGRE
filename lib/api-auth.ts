import { NextResponse } from 'next/server';
import { getCurrentUser, type User, type UserRole } from './auth';

type RoleCheckResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<RoleCheckResult> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Wymagane logowanie' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Brak uprawnień do wykonania tej operacji' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user };
}
