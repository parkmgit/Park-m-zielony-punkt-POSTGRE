"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Save } from "lucide-react";
import Link from "next/link";

type SpeciesFormData = { name: string; scientific_name: string };

export default function EditSpeciesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const speciesId = params.id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({ name: "", scientific_name: "" });

  useEffect(() => {
    if (!speciesId) {
      return;
    }

    const fetchSpecies = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/species/${speciesId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Nie udało się pobrać gatunku");
        }

        setFormData({
          name: data.name ?? "",
          scientific_name: data.scientific_name ?? "",
        });
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać gatunku",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSpecies();
  }, [speciesId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedFormData: SpeciesFormData = {
      name: formData.name.trim(),
      scientific_name: formData.scientific_name.trim(),
    };

    if (!normalizedFormData.name) {
      setErrorMessage("Nazwa polska jest wymagana.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/species/${speciesId}`, {
        method: "PUT",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          scientific_name: formData.scientific_name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd podczas aktualizowania gatunku");
      }

      router.push("/species");
      router.refresh();
    } catch (error) {
      console.error("Błąd podczas aktualizowania gatunku:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas aktualizowania gatunku",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      // Pobieranie danych gatunku...
      <></>
    );
  }

  if (errorMessage && !formData.name) {
    return (
      //  Powrót do strony głównej

      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-red-700 shadow-lg dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-300">
        <h1 className="mb-2 text-xl font-bold">
          Nie udało się otworzyć gatunku
        </h1>

        <p>{errorMessage}</p>
      </div>
    );
  }

  return (
    //  Powrót do strony głównej
       
        
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 py-8">
    <div className="container mx-auto px-4 max-w-2xl">
      <Link
          href="/species"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do strony głównej
        </Link>
        
          <div className="glass rounded-3xl p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-6">
            <Leaf className="w-8 h-8 text-green-600 dark:text-[#22c55e]" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-[#22c55e]">
            Edytuj Gatunek Drzewa
          </h1>
        </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Identyfikator gatunku: {speciesId}
          </p>
        

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {errorMessage}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="mb-2 block font-semibold text-gray-700 dark:text-slate-200"
          >
            Nazwa polska{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>

          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={(event) =>
              setFormData((currentData) => ({
                ...currentData,
                name: event.target.value,
              }))
            }
            required
            disabled={isSaving}
            autoComplete="off"
            placeholder="np. Dąb szypułkowy"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="scientific_name"
            className="mb-2 block font-semibold text-gray-700 dark:text-slate-200"
          >
            Nazwa łacińska (naukowa)
          </label>

          <input
            id="scientific_name"
            name="scientific_name"
            type="text"
            value={formData.scientific_name}
            onChange={(event) =>
              setFormData((currentData) => ({
                ...currentData,
                scientific_name: event.target.value,
              }))
            }
            disabled={isSaving}
            autoComplete="off"
            placeholder="np. Quercus robur"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 italic outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Opcjonalne: nazwa naukowa gatunku
          </p>
        </div>
        
        <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-base py-4"
        >
          {isSaving ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Zapisywanie zmian...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Zapisz zmiany
            </>
          )}
        </button>

          <Link
            href="/species"
            className="btn-cancel"
            >
            Anuluj
          </Link>
          </div>

      </form>
      </div>
      </div>
      
    </div>
  );
}
