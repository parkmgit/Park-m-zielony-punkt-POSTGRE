import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/session';

const publicPaths = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/init',
];

function isPublicPath(pathname: string) {
  return publicPaths.some(
    path => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function unauthorizedResponse(request: NextRequest, message: string) {
  const { pathname } = request.nextUrl;
  const response = pathname.startsWith('/api/')
    ? NextResponse.json({ error: message }, { status: 401 })
    : NextResponse.redirect(new URL('/login', request.url));

  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    (pathname.includes('.') && !pathname.includes('/api/'))
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return unauthorizedResponse(request, 'Wymagane logowanie');
  }

  const session = await verifySession(sessionCookie.value);
  if (!session) {
    return unauthorizedResponse(request, 'Nieprawidłowa sesja');
  }

  if (session.expiresAt < Date.now()) {
    return unauthorizedResponse(request, 'Sesja wygasła');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
