
"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ChartColumn, Trees, MapPin } from "lucide-react";
import Link from "next/link";
import { getProvinces, provinceKey } from "@/lib/province-client";

interface TreeRecord {
  id: number;
  latitude: number | string | null;
  longitude: number | string | null;
}

const VOIVODESHIPS = [
  "Dolnośląskie",
  "Kujawsko-pomorskie",
  "Lubelskie",
  "Lubuskie",
  "Łódzkie",
  "Małopolskie",
  "Mazowieckie",
  "Opolskie",
  "Podkarpackie",
  "Podlaskie",
  "Pomorskie",
  "Śląskie",
  "Świętokrzyskie",
  "Warmińsko-mazurskie",
  "Wielkopolskie",
  "Zachodniopomorskie",
];

export default function StatisticsPage() {
  const [trees, setTrees] = useState<TreeRecord[]>([]);
  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [lookupFailures, setLookupFailures] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/trees", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać drzew.");
        }

        const data = await response.json();

        const treeList: TreeRecord[] = Array.isArray(data)
          ? data
          : Array.isArray(data.trees)
            ? data.trees
            : [];

        if (cancelled) return;

        setTrees(treeList);

        const counts: Record<string, number> = {};

        VOIVODESHIPS.forEach((province) => {
          counts[province] = 0;
        });

        const valid = treeList.map(tree => ({ tree, key: tree.latitude == null || tree.longitude == null ? null : provinceKey(Number(tree.latitude), Number(tree.longitude)) }));
        const coordinates = valid.filter(item => item.key !== null).map(item => [Number(item.tree.latitude), Number(item.tree.longitude)] as [number, number]);
        const results = await getProvinces(coordinates);
        if (cancelled) return;
        let failures = 0;
        for (const item of valid) {
          const result = item.key ? results[item.key] : null;
          if (result?.status === 'resolved' && result.province && counts[result.province] !== undefined) counts[result.province]++;
          if (result?.status === 'error') failures++;
        }
        setLookupFailures(failures);
        setProgress(100);

        if (!cancelled) {
          setStatistics(counts);
        }
      } catch (err) {
        console.error("Błąd statystyk:", err);
        if (!cancelled) {
          setError("Nie udało się załadować statystyk drzew.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatistics();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalTrees = Object.values(statistics).reduce(
    (sum, count) => sum + count,
    0
  );

  const maxCount = Math.max(
    ...Object.values(statistics),
    1
  );

  const sortedProvinces = [...VOIVODESHIPS].sort(
    (a, b) => (statistics[b] || 0) - (statistics[a] || 0)
  );

  const unassignedTrees = trees.length - totalTrees;

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-4xl">

        {/* Nawigacja */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót
          </Link>
        </div>

        {/* Główna karta */}
        <div className="glass rounded-3xl p-8 gradient-border-green">

          {/* Nagłówek */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
              <ChartColumn className="w-5 h-5 text-white" />
            </div>

            <h1 className="text-2xl font-black text-gradient-green">
              Statystyki Drzew
            </h1>
          </div>

          {/* Podsumowanie */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
                <Trees className="w-4 h-4 text-green-400" />
                Wszystkie drzewa
              </div>
              <p className="text-3xl font-black text-white">
                {trees.length}
              </p>
            </div>

            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
                <MapPin className="w-4 h-4 text-green-400" />
                Przypisane do województw
              </div>
              <p className="text-3xl font-black text-green-400">
                {totalTrees}
              </p>
            </div>
          </div>

          {/* Błąd */}
          {error && (
            <div className="text-center py-6 text-red-400">
              {error}
            </div>
          )}

          {/* Ładowanie */}
          {loading && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-white/50 mb-2">
                <span>Ustalanie województw...</span>
                <span>{progress}%</span>
              </div>

              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!loading && lookupFailures > 0 && <p className="text-amber-400 text-sm mb-4">Nie udało się sprawdzić {lookupFailures} lokalizacji z powodu błędu usługi. Nie są liczone jako nieustalone województwo.</p>}
          {/* Lista województw */}
          {!error && (
            <>
              <div className="mb-4">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">
                  Liczba drzew według województw
                </h2>
              </div>

              <div className="space-y-3">
                {sortedProvinces.map((province) => {
                  const count = statistics[province] || 0;
                  const percentage = (count / maxCount) * 100;

                  return (
                    <div
                      key={province}
                      className="glass rounded-2xl px-4 py-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white text-sm">
                          {province}
                        </h3>

                        <span className="font-bold text-green-400 text-sm">
                          {count} {count === 1 ? "drzewo" : "drzew"}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-lime-500 to-green-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Podsumowanie na dole */}
          {!loading && !error && (
            <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
              <p className="text-xs text-white/40">
                Łącznie:{" "}
                <span className="font-bold text-white/70">
                  {trees.length}
                </span>{" "}
                drzew
              </p>

              <p className="text-xs text-white/40">
                Przypisane do województw:{" "}
                <span className="font-bold text-green-400">
                  {totalTrees}
                </span>
              </p>

              <p className="text-xs text-white/40">
                Nieustalone województwo (bez błędów usługi):{" "}
                <span className="font-bold text-yellow-400">
                  {unassignedTrees - lookupFailures}
                </span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
