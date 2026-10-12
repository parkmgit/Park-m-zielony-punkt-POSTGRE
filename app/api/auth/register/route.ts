import { NextRequest, NextResponse } from 'next/server';
import { register } from '../../../../lib/auth';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await register(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}