import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db-config';
import { CreateTreeDTO } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const siteId = searchParams.get('site_id');
    const status = searchParams.get('status');
    const workerId = searchParams.get('worker_id');

    let sqlQuery = `
      SELECT 
        t.*,
        sp.name as species_name,
        s.name as site_name,
        s.code as site_code,
        s.address as site_address,
        s.project_id as project_id,
        p.name as project_name,
        p.project_number as project_number,
        w.name as worker_name,
        c.name as creator_name
      FROM trees t
      LEFT JOIN species sp ON t.species_id = sp.id
      LEFT JOIN sites s ON t.site_id = s.id
      LEFT JOIN projects p ON s.project_id = p.id
      LEFT JOIN users w ON t.worker_id = w.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (siteId) {
      sqlQuery += ' AND t.site_id = ?';
      params.push(siteId);
    }

    if (status) {
      sqlQuery += ' AND t.status = ?';
      params.push(status);
    }

    if (workerId) {
      sqlQuery += ' AND t.worker_id = ?';
      params.push(workerId);
    }

    sqlQuery += ' ORDER BY t.created_at DESC';

    const trees = await query(sqlQuery, params);

    // Convert latitude/longitude from string to number (PostgreSQL DECIMAL returns string)
    const treesWithNumbers = trees.map((tree: any) => ({
      ...tree,
      latitude: parseFloat(tree.latitude),
      longitude: parseFloat(tree.longitude),
      accuracy: tree.accuracy ? parseFloat(tree.accuracy) : null
    }));

    return NextResponse.json(treesWithNumbers);
  } catch (error) {
    console.error('Error fetching trees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Wymagane logowanie' },
        { status: 401 }
      );
    }

    const body: CreateTreeDTO = await request.json();
    
    console.log('=== POST /api/trees ===');
    console.log('Received body:', JSON.stringify(body, null, 2));

    const createdBy = Number(user.id);

    console.log('Inserting with values:', {
      tree_number: body.tree_number || null,
      species_id: body.species_id || null,
      site_id: body.site_id,
      worker_id: body.worker_id || null,
      plant_date: body.plant_date,
      status: body.status,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracy: body.accuracy || null,
      notes: body.notes || null,
      created_by: createdBy
    });

    await query(
      `INSERT INTO trees (
        tree_number, species_id, site_id, worker_id, plant_date, status,
        latitude, longitude, accuracy, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        createdBy
      ]
    );

    // Get the last inserted tree
    const lastTree = await query<any>('SELECT id FROM trees ORDER BY id DESC LIMIT 1');
    const treeId = lastTree[0]?.id;
    console.log('Tree inserted with ID:', treeId);

    // Also create initial action
    await query(
      'INSERT INTO tree_actions (tree_id, action_type, notes, performed_by) VALUES (?, ?, ?, ?)',
      [treeId, 'posadzenie', body.notes || 'Drzewo posadzone', createdBy]
    );

    console.log('Tree action created successfully');
    console.log('=== SUCCESS ===\n');

    return NextResponse.json({
      id: treeId,
      message: 'Tree created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('=== ERROR creating tree ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    console.error('=========================\n');
    return NextResponse.json(
      { error: 'Failed to create tree', details: error.message },
      { status: 500 }
    );
  }
}
