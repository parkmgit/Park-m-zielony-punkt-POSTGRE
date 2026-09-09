import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-config';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Wymagane logowanie' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const treeId = searchParams.get('tree_id');
    const onlyMine = searchParams.get('mine') !== 'false';

    let sqlQuery = `
      SELECT
        wr.*,
        t.tree_number,
        sp.name as species_name,
        s.name as site_name,
        s.code as site_code,
        u.name as assigned_user_name
      FROM watering_reminders wr
      LEFT JOIN trees t ON wr.tree_id = t.id
      LEFT JOIN species sp ON t.species_id = sp.id
      LEFT JOIN sites s ON t.site_id = s.id
      LEFT JOIN users u ON wr.assigned_user_id = u.id
      WHERE wr.status = 'active'
    `;

    const params: any[] = [];

    if (onlyMine) {
      sqlQuery += ' AND wr.assigned_user_id = ?';
      params.push(user.id);
    }

    if (treeId) {
      sqlQuery += ' AND wr.tree_id = ?';
      params.push(treeId);
    }

    sqlQuery += `
      AND (wr.due_at - (wr.remind_before_hours * INTERVAL '1 hour')) <= CURRENT_TIMESTAMP
      ORDER BY
        CASE WHEN wr.due_at <= CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
        wr.due_at ASC
    `;

    const reminders = await query(sqlQuery, params);
    return NextResponse.json(reminders);
  } catch (error) {
    console.error('Error fetching watering reminders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watering reminders' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Wymagane logowanie' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const reminderId = Number(body.id);
    const status = body.status;

    if (!reminderId || !['done', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Nieprawidlowe dane przypomnienia' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE watering_reminders
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND assigned_user_id = ?`,
      [status, reminderId, user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating watering reminder:', error);
    return NextResponse.json(
      { error: 'Failed to update watering reminder' },
      { status: 500 }
    );
  }
}
