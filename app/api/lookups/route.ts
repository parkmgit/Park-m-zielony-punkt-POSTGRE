import { NextResponse } from 'next/server';
import { query } from '@/lib/db-config';

export async function GET() {
  try {
    let users = [];
    let projects = [];
    let sites = [];
    let species = [];

    try {
      users = await query('SELECT * FROM users WHERE active = true ORDER BY name');
    } catch (e) {
      console.error('Error loading users:', e);
    }

    try {
      projects = await query('SELECT * FROM projects WHERE active = true ORDER BY name');
    } catch (e) {
      console.error('Error loading projects:', e);
    }

    try {
      sites = await query(`
        SELECT s.*, p.name as project_name, p.project_number 
        FROM sites s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.active = true 
        ORDER BY s.code
      `);
    } catch (e) {
      console.error('Error loading sites:', e);
    }

    try {
      species = await query('SELECT * FROM species WHERE active = true ORDER BY name');
    } catch (e) {
      console.error('Error loading species:', e);
    }

    return NextResponse.json({
      users,
      projects,
      sites,
      species,
      statuses: ['posadzone', 'podlewanie', 'utrzymanie', 'wymiana', 'usunięte'],
      actionTypes: ['posadzenie', 'podlewanie', 'przycinanie', 'inspekcja', 'wymiana', 'usunięcie']
    });
  } catch (error) {
    console.error('Error fetching lookups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lookups', details: (error as Error).message },
      { status: 500 }
    );
  }
}
