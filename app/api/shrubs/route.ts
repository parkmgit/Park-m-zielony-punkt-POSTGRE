import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db-config';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const siteId = searchParams.get('site_id');
    const status = searchParams.get('status');

    let sql = `
      SELECT
        sh.*,
        sp.name as species_name,
        s.name as site_name,
        s.code as site_code,
        s.project_id,
        p.name as project_name,
        p.project_number,
        w.name as worker_name
      FROM shrubs sh
      LEFT JOIN species sp ON sh.species_id = sp.id
      LEFT JOIN sites s ON sh.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users w ON sh.worker_id = w.id
      WHERE sh.active = true
    `;
    const params: any[] = [];

    if (siteId) { sql += ' AND sh.site_id = ?'; params.push(siteId); }
    if (status) { sql += ' AND sh.status = ?'; params.push(status); }

    sql += ' ORDER BY sh.created_at DESC';

    const rows = await query(sql, params);
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('Error fetching shrubs:', error);
    return NextResponse.json({ error: 'Failed to fetch shrubs', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { site_id, species_id, quantity, plant_date, worker_id, status, notes } = body;

    if (!site_id || !species_id || !quantity || !plant_date) {
      return NextResponse.json({ error: 'Wymagane pola: miejsce, gatunek, ilość, data' }, { status: 400 });
    }

    const shrub = await queryOne(
      `INSERT INTO shrubs (site_id, species_id, quantity, plant_date, worker_id, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [site_id, species_id, quantity, plant_date, worker_id || null, status || 'posadzone', notes || null, user?.id || null]
    );

    return NextResponse.json(shrub, { status: 201 });
  } catch (error: any) {
    console.error('Error creating shrub:', error);
    return NextResponse.json({ error: 'Failed to create shrub', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wymagane' }, { status: 400 });
    await query('UPDATE shrubs SET active = false WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete shrub' }, { status: 500 });
  }
}
