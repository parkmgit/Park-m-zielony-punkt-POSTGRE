import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db-config';

export async function GET() {
  try {
    const result = await query(`
      SELECT * FROM species
      WHERE active = true
      ORDER BY name ASC
    `);

    return NextResponse.json(result || []);
  } catch (error) {
    console.error('Error fetching species:', error);
    // Zwróć pustą tablicę zamiast obiektu z błędem
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, scientific_name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nazwa gatunku jest wymagana' },
        { status: 400 }
      );
    }

    // Check if soft-deleted species with this name exists — reactivate it
    const existing = await queryOne('SELECT * FROM species WHERE name = ?', [name]);
    if (existing) {
      if ((existing as any).active) {
        return NextResponse.json(
          { error: 'Gatunek o tej nazwie już istnieje' },
          { status: 400 }
        );
      }
      // Reactivate soft-deleted
      const reactivated = await queryOne(
        'UPDATE species SET active = true, scientific_name = ? WHERE name = ? RETURNING *',
        [scientific_name || (existing as any).scientific_name, name]
      );
      return NextResponse.json(reactivated, { status: 201 });
    }

    const species = await queryOne(
      'INSERT INTO species (name, scientific_name) VALUES (?, ?) RETURNING *',
      [name, scientific_name || null]
    );

    return NextResponse.json(species, { status: 201 });
  } catch (error: any) {
    console.error('Error creating species:', error);
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'Gatunek o tej nazwie już istnieje' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to create species', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID gatunku jest wymagane' }, { status: 400 });
    }

    // Soft delete - set active to false
    await query('UPDATE species SET active = false WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Gatunek został usunięty' });
  } catch (error) {
    console.error('Error deleting species:', error);
    return NextResponse.json({ error: 'Failed to delete species' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, scientific_name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID i nazwa gatunku są wymagane' },
        { status: 400 }
      );
    }

    await query(
      'UPDATE species SET name = ?, scientific_name = ? WHERE id = ?',
      [name, scientific_name || null, id]
    );

    const species = await queryOne('SELECT * FROM species WHERE id = ?', [id]);

    return NextResponse.json(species);
  } catch (error: any) {
    console.error('Error updating species:', error);
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint') || error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'Gatunek o tej nazwie już istnieje' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to update species', details: error.message }, { status: 500 });
  }
}
