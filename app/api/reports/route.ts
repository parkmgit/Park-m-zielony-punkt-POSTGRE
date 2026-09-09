import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-config';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');

    // Per-user activity summary
    const userStats = await query<any>(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at as registered_at,
        COUNT(DISTINCT t.id)::int AS trees_added,
        MAX(t.created_at) AS last_tree_at,
        COUNT(DISTINCT ta.id)::int AS actions_count,
        MAX(ta.performed_at) AS last_action_at,
        GREATEST(
          COALESCE(MAX(t.created_at), '1900-01-01'::timestamp),
          COALESCE(MAX(ta.performed_at), '1900-01-01'::timestamp),
          COALESCE(u.last_seen_at, '1900-01-01'::timestamp)
        ) AS last_activity_at
      FROM users u
      LEFT JOIN trees t ON t.created_by = u.id
      LEFT JOIN tree_actions ta ON ta.performed_by = u.id
      WHERE u.active = true
      GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_seen_at
      ORDER BY last_activity_at DESC NULLS LAST
    `);

    // Recent trees (filterable by user)
    let treesSql = `
      SELECT
        t.id,
        t.tree_number,
        t.plant_date,
        t.status,
        t.created_at,
        t.latitude,
        t.longitude,
        u.name AS added_by,
        u.id AS added_by_id,
        sp.name AS species_name,
        p.name AS project_name,
        p.project_number
      FROM trees t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN species sp ON t.species_id = sp.id
      LEFT JOIN sites s ON t.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
    `;
    const params: any[] = [];
    if (userId) {
      treesSql += ' WHERE t.created_by = ?';
      params.push(parseInt(userId));
    }
    treesSql += ' ORDER BY t.created_at DESC LIMIT 100';

    const recentTrees = await query<any>(treesSql, params);

    return NextResponse.json({ userStats, recentTrees });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}
