import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { queryOne } from './db';
import { hashPassword, validatePassword } from './password';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  signSession,
  verifySession,
} from './session';

export type UserRole = 'admin' | 'brygadzista' | 'pracownik';

export interface User {
  id: number;
  name: string;
  role: UserRole;
  email: string | null;
  active: boolean;
  created_at?: string;
  last_seen_at?: string | null;
  password_hash?: string | null;
}

export type PublicUser = Omit<User, 'password_hash'>;

type AuthOperationResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string };

const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;

async function setUserSession(user: User) {
  const token = await signSession({
    userId: user.id,
    email: user.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

function withoutPassword(user: User): PublicUser {
  const { password_hash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function login(
  email: unknown,
  password: unknown
): Promise<AuthOperationResult> {
  try {
    if (typeof email !== 'string' || typeof password !== 'string') {
      return { ok: false, error: 'Email i hasło są wymagane' };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await queryOne<User>(
      'SELECT * FROM users WHERE email = ? AND active = true',
      [normalizedEmail]
    );

    if (!user?.password_hash) {
      return { ok: false, error: 'Nieprawidłowy email lub hasło' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return { ok: false, error: 'Nieprawidłowy email lub hasło' };
    }

    await setUserSession(user);
    return { ok: true, user: withoutPassword(user) };
  } catch (error) {
    console.error('Login error:', error);
    return { ok: false, error: 'Błąd logowania' };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    const sessionData = await verifySession(sessionCookie.value);
    if (!sessionData || sessionData.expiresAt < Date.now()) return null;

    return queryOne<User>(
      'SELECT * FROM users WHERE id = ? AND active = true',
      [sessionData.userId]
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export async function register(data: RegisterData): Promise<AuthOperationResult> {
  try {
    if (
      typeof data?.email !== 'string' ||
      typeof data?.name !== 'string'
    ) {
      return { ok: false, error: 'Imię, email i hasło są wymagane' };
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedName = data.name.trim();

    if (!normalizedEmail.endsWith('@park-m.pl')) {
      return { ok: false, error: 'Email musi kończyć się na @park-m.pl' };
    }

    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );
    if (existingUser) {
      return { ok: false, error: 'Użytkownik z tym adresem email już istnieje' };
    }

    if (normalizedName.length < 3) {
      return { ok: false, error: 'Imię i nazwisko musi mieć minimum 3 znaki' };
    }

    const passwordError = validatePassword(data.password);
    if (passwordError) return { ok: false, error: passwordError };

    const passwordHash = await hashPassword(data.password);

    // Rejestracja publiczna nigdy nie nadaje uprawnień administratora.
    const newUser = await queryOne<User>(
      `INSERT INTO users (name, role, email, password_hash, active)
       VALUES (?, 'pracownik', ?, ?, true)
       RETURNING *`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    if (!newUser) {
      return { ok: false, error: 'Błąd podczas tworzenia użytkownika' };
    }

    await setUserSession(newUser);
    return { ok: true, user: withoutPassword(newUser) };
  } catch (error) {
    console.error('Registration error:', error);
    return { ok: false, error: 'Błąd podczas rejestracji' };
  }
}
