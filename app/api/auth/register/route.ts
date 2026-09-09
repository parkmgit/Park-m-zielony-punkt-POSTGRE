import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Rejestracja jest wyłączona. Skontaktuj się z administratorem.' },
    { status: 403 }
  );
}
