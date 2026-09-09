import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db-config';
import { CreateTreeActionDTO } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actions = await query(`
      SELECT 
        ta.*,
        u.name as performer_name
      FROM tree_actions ta
      LEFT JOIN users u ON ta.performed_by = u.id
      WHERE ta.tree_id = ?
      ORDER BY ta.performed_at DESC
    `, [params.id]);

    return NextResponse.json(actions);
  } catch (error) {
    console.error('Error fetching tree actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tree actions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Wymagane logowanie' },
        { status: 401 }
      );
    }

    const body: CreateTreeActionDTO = await request.json();

    const performedBy = Number(user.id);

    await query(
      'INSERT INTO tree_actions (tree_id, action_type, notes, performed_by) VALUES (?, ?, ?, ?)',
      [params.id, body.action_type, body.notes || null, performedBy]
    );

    // Get the newly created action
    const newAction = await query(
      'SELECT * FROM tree_actions WHERE tree_id = ? ORDER BY id DESC LIMIT 1',
      [params.id]
    );

    if (body.action_type === 'podlewanie' && body.next_watering_at) {
      const remindBeforeHours = Number(body.remind_before_hours || 24);

      await query(
        `UPDATE watering_reminders
         SET status = 'done', updated_at = CURRENT_TIMESTAMP
         WHERE tree_id = ? AND assigned_user_id = ? AND status = 'active' AND due_at <= CURRENT_TIMESTAMP`,
        [params.id, performedBy]
      );

      await query(
        `INSERT INTO watering_reminders (
          tree_id, assigned_user_id, source_action_id, due_at, remind_before_hours, created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          params.id,
          performedBy,
          newAction[0].id,
          body.next_watering_at,
          Math.max(0, remindBeforeHours),
          performedBy
        ]
      );
    }

    // Update tree's updated_at timestamp
    await query('UPDATE trees SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [params.id]);

    return NextResponse.json({
      id: newAction[0].id,
      message: 'Tree action created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tree action:', error);
    return NextResponse.json(
      { error: 'Failed to create tree action' },
      { status: 500 }
    );
  }
}
