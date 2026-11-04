export const SESSION_COOKIE_NAME = 'park-m-session';
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;

export interface SessionData {
  userId: number;
  email: string | null;
  expiresAt: number;
}

function getSessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    process.env.DB_PASSWORD;

  if (!secret) {
    throw new Error('Brak SESSION_SECRET (lub konfiguracji bazy używanej jako klucz zapasowy)');
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encodePayload(payload: SessionData) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(payload: SessionData) {
  const encodedPayload = encodePayload(payload);
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );

  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encodedPayload, encodedSignature] = parts;
    const key = await getSigningKey();
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(encodedPayload)
    );

    if (!isValid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    ) as Partial<SessionData>;

    if (
      !Number.isInteger(payload.userId) ||
      typeof payload.expiresAt !== 'number' ||
      (payload.email !== null && typeof payload.email !== 'string')
    ) {
      return null;
    }

    return payload as SessionData;
  } catch {
    return null;
  }
}
