import bcrypt from 'bcrypt';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć minimum ${PASSWORD_MIN_LENGTH} znaków`;
  }

  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Hasło nie może przekraczać ${PASSWORD_MAX_BYTES} bajtów`;
  }

  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
