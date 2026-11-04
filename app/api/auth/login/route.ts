import { NextRequest, NextResponse } from 'next/server';
import { login } from '../../../../lib/auth';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await login(body.email, body.password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.user);
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
