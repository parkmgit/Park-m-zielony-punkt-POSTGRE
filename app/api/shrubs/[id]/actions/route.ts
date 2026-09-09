import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db-config';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rows = await query(
      `SELECT sa.*, u.name as performer_name
       FROM shrub_actions sa
       LEFT JOIN users u ON sa.performer_id = u.id
       WHERE sa.shrub_id = $1
       ORDER BY sa.performed_at DESC`,
      [id]
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action_type, quantity_affected, performed_at, performer_id, notes } = body;

    if (!action_type) {
      return NextResponse.json({ error: 'Typ akcji jest wymagany' }, { status: 400 });
    }

    const action = await queryOne(
      `INSERT INTO shrub_actions (shrub_id, action_type, quantity_affected, performed_at, performer_id, notes)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      [id, action_type, quantity_affected || null, performed_at || new Date().toISOString(), performer_id || null, notes || null]
    );

    return NextResponse.json(action, { status: 201 });
  } catch (error: any) {
    console.error('Error creating shrub action:', error);
    return NextResponse.json({ error: 'Failed to create action', details: error.message }, { status: 500 });
  }
}
