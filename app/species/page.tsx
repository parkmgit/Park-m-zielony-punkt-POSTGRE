"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Leaf, Plus, ArrowLeft, Trash2, Edit } from "lucide-react";
import Link from "next/link";

interface Species {
  id: number;
  name: string;
  scientific_name: string | null;
  active: boolean;
}

export default function SpeciesPage() {
  const router = useRouter();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpecies();
  }, []);

  const fetchSpecies = async () => {
    try {
      const response = await fetch("/api/species");
      const data = await response.json();

      // Sprawdź czy data jest tablicą
      if (Array.isArray(data)) {
        setSpecies(data);
      } else {
        console.error("API returned non-array data:", data);
        setSpecies([]);
      }
    } catch (error) {
      console.error("Error fetching species:", error);
      setSpecies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć gatunek "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/species?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete species");
      }

      alert("Gatunek został usunięty");
      fetchSpecies();
    } catch (error) {
      console.error("Error deleting species:", error);
      alert("Wystąpił błąd podczas usuwania gatunku");
    }
  };

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Powrót
          </Link>
          <Link
            href="/add-species"
            className="inline-flex items-center gap-2 font-bold text-sm text-white px-4 py-2 rounded-2xl transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg,#16a34a,#22c55e)",
              boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
            }}
          >
            <Plus className="w-4 h-4" /> Dodaj Gatunek
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gradient-green">
              Gatunki Drzew
            </h1>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Ładowanie...</p>
            </div>
          ) : species.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Brak gatunków drzew
              </p>
              <Link
                href="/add-species"
                className="inline-flex items-center gap-2 text-green-600 dark:text-[#22c55e] hover:underline"
              >
                <Plus className="w-4 h-4" />
                Dodaj pierwszy gatunek
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {species.map((item) => (
                <div
                  key={item.id}
                  className="glass rounded-2xl flex items-center justify-between px-4 py-3 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-sm">
                      {item.name}
                    </h3>
                    {item.scientific_name && (
                      <p className="text-xs text-white/40 italic mt-0.5">
                        {item.scientific_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/edit-species/${item.id}`}
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-white/30 hover:text-green-400 hover:bg-green-500/10 transition-all cursor-pointer"
                      title="Edytuj"
                      aria-label={`Edytuj gatunek ${item.name}`}
                    >
                      <Edit className="w-5 h-5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Usuń"
                      aria-label={`Usuń gatunek ${item.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-white/8">
            <p className="text-xs text-white/30">
              Łącznie:{" "}
              <span className="font-bold text-white/60">{species.length}</span>{" "}
              gatunków
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
