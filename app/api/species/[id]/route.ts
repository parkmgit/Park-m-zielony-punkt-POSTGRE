import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { queryOne, withTransaction } from "@/lib/db-config";

type RouteContext = { params: Promise<{ id: string }> };

type SpeciesUpdateBody = { name?: string; scientific_name?: string | null };

interface SpeciesRow {
  id: number;
  name: string;
  scientific_name: string | null;
  active: boolean;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID gatunku jest wymagane" },
        { status: 400 },
      );
    }

    const species = await queryOne(
      "SELECT * FROM species WHERE id = ? AND active = true",
      [id],
    );

    if (!species) {
      return NextResponse.json(
        { error: "Nie znaleziono aktywnego gatunku" },
        { status: 404 },
      );
    }

    return NextResponse.json(species, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Nieznany błąd";

    return NextResponse.json(
      {
        error: "Nie udało się pobrać gatunku",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as SpeciesUpdateBody;

    const name = String(body.name ?? "").trim();
    const scientificName = String(body.scientific_name ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "ID gatunku jest wymagane" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nazwa gatunku jest wymagana" },
        { status: 400 },
      );
    }

    const result = await withTransaction(async client => {
      const existingResult = await client.query<SpeciesRow>(
        "SELECT id, name, scientific_name, active FROM species WHERE id = $1 AND active = true FOR UPDATE",
        [id],
      );
      if (!existingResult.rows[0]) return { status: "not-found" as const };

      const duplicateResult = await client.query<{ id: number }>(
        "SELECT id FROM species WHERE name = $1 AND id <> $2 AND active = true",
        [name, id],
      );
      if (duplicateResult.rows[0]) return { status: "duplicate" as const };

      const updatedResult = await client.query<SpeciesRow>(
        `UPDATE species
         SET name = $1, scientific_name = $2
         WHERE id = $3 AND active = true
         RETURNING id, name, scientific_name, active`,
        [name, scientificName || null, id],
      );

      // Nazwa gatunku pozostaje znormalizowana w species. Znacznik czasu informuje
      // klientów i przyszłą synchronizację, że reprezentacja drzewa się zmieniła.
      const treesResult = await client.query<{ id: number }>(
        `UPDATE trees
         SET updated_at = CURRENT_TIMESTAMP
         WHERE species_id = $1
         RETURNING id`,
        [id],
      );

      return {
        status: "updated" as const,
        species: updatedResult.rows[0],
        affectedTrees: treesResult.rowCount ?? 0,
      };
    });

    if (result.status === "not-found") {
      return NextResponse.json(
        { error: "Nie znaleziono aktywnego gatunku" },
        { status: 404 },
      );
    }

    if (result.status === "duplicate") {
      return NextResponse.json(
        { error: "Inny gatunek o tej nazwie już istnieje" },
        { status: 409 },
      );
    }

    revalidatePath("/species");
    revalidatePath("/trees");
    revalidatePath("/map");
    revalidatePath("/reports");

    return NextResponse.json(
      { ...result.species, affectedTrees: result.affectedTrees },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Nieznany błąd";

    if (
      errorMessage.includes("duplicate key") ||
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("UNIQUE constraint")
    ) {
      return NextResponse.json(
        { error: "Gatunek o tej nazwie już istnieje" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Nie udało się zaktualizować gatunku",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
