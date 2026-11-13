import { NextResponse } from 'next/server';
import { coordinateKey, lookupProvinces } from '@/lib/provinces';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.coordinates) || body.coordinates.length > 1000) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }
    const keys = body.coordinates.map((item: unknown) => {
      if (!Array.isArray(item) || item.length !== 2 || item.some(value => value === null || value === '')) return null;
      return coordinateKey(Number(item[0]), Number(item[1]));
    }).filter((key: string | null): key is string => key !== null);
    return NextResponse.json({ results: await lookupProvinces(keys) });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
