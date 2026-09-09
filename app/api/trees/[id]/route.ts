import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tree = await queryOne(`
      SELECT 
        t.*,
        sp.name as species_name,
        s.name as site_name,
        s.code as site_code,
        w.name as worker_name,
        c.name as creator_name
      FROM trees t
      LEFT JOIN species sp ON t.species_id = sp.id
      LEFT JOIN sites s ON t.site_id = s.id
      LEFT JOIN users w ON t.worker_id = w.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = ?
    `, [params.id]);

    if (!tree) {
      return NextResponse.json(
        { error: 'Tree not found' },
        { status: 404 }
      );
    }

    // Convert latitude/longitude from string to number (PostgreSQL DECIMAL returns string)
    const treeWithNumbers = {
      ...tree,
      latitude: parseFloat(tree.latitude),
      longitude: parseFloat(tree.longitude),
      accuracy: tree.accuracy ? parseFloat(tree.accuracy) : null
    };

    return NextResponse.json(treeWithNumbers);
  } catch (error) {
    console.error('Error fetching tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tree' },
      { status: 500 }
    );
  }
}

// UPDATE tree
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    console.log('Updating tree:', params.id, body);

    await query(
      `UPDATE trees SET 
        tree_number = ?,
        species_id = ?,
        site_id = ?,
        worker_id = ?,
        plant_date = ?,
        status = ?,
        latitude = ?,
        longitude = ?,
        accuracy = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        body.tree_number || null,
        body.species_id ? parseInt(body.species_id as any) : null,
        parseInt(body.site_id as any),
        body.worker_id ? parseInt(body.worker_id as any) : null,
        body.plant_date,
        body.status,
        body.latitude,
        body.longitude,
        body.accuracy || null,
        body.notes || null,
        params.id
      ]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Tree updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating tree:', error);
    return NextResponse.json(
      { error: 'Failed to update tree', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - update only location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    if (body.latitude === undefined || body.longitude === undefined) {
      return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 });
    }
    await query(
      `UPDATE trees SET latitude = $1, longitude = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [body.latitude, body.longitude, params.id]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update location', details: error.message }, { status: 500 });
  }
}

// DELETE tree
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Deleting tree:', params.id);

    // Check if tree exists
    const tree = await queryOne('SELECT id FROM trees WHERE id = ?', [params.id]);
    
    if (!tree) {
      return NextResponse.json(
        { error: 'Tree not found' },
        { status: 404 }
      );
    }

    // Delete tree (cascade will delete related actions and photos)
    await query('DELETE FROM trees WHERE id = ?', [params.id]);

    return NextResponse.json({ 
      success: true,
      message: 'Tree deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting tree:', error);
    return NextResponse.json(
      { error: 'Failed to delete tree', details: error.message },
      { status: 500 }
    );
  }
}
