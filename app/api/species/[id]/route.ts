import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db-config";

type RouteContext = { params: Promise<{ id: string }> };

type SpeciesUpdateBody = { name?: string; scientific_name?: string | null };

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

    return NextResponse.json(species);
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

    const existingSpecies = await queryOne(
      "SELECT * FROM species WHERE id = ? AND active = true",
      [id],
    );

    if (!existingSpecies) {
      return NextResponse.json(
        { error: "Nie znaleziono aktywnego gatunku" },
        { status: 404 },
      );
    }

    const speciesWithSameName = await queryOne(
      "SELECT * FROM species WHERE name = ? AND id <> ? AND active = true",
      [name, id],
    );

    if (speciesWithSameName) {
      return NextResponse.json(
        { error: "Inny gatunek o tej nazwie już istnieje" },
        { status: 409 },
      );
    }

    await query(
      "UPDATE species SET name = ?, scientific_name = ? WHERE id = ? AND active = true",
      [name, scientificName || null, id],
    );

    const updatedSpecies = await queryOne(
      "SELECT * FROM species WHERE id = ? AND active = true",
      [id],
    );

    if (!updatedSpecies) {
      return NextResponse.json(
        { error: "Nie udało się odczytać zaktualizowanego gatunku" },
        { status: 500 },
      );
    }

    return NextResponse.json(updatedSpecies);
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
