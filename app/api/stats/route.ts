import { NextResponse } from 'next/server';
import { query } from '@/lib/db-config';

export async function GET() {
  try {
    const [trees, projects, species] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) as count FROM trees'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM projects WHERE active = true'),
      query<{ count: string }>('SELECT COUNT(*) as count FROM species WHERE active = true'),
    ]);
    return NextResponse.json({
      trees: parseInt(trees[0]?.count ?? '0'),
      projects: parseInt(projects[0]?.count ?? '0'),
      species: parseInt(species[0]?.count ?? '0'),
    });
  } catch {
    return NextResponse.json({ trees: 0, projects: 0, species: 0 });
  }
}
