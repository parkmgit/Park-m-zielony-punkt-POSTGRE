'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddSpeciesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/species', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Błąd podczas dodawania gatunku');
        return;
      }

      alert('Gatunek został dodany pomyślnie!');
      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas dodawania gatunku');
    } finally {
      setLoading(false);
    }
  };

  return (
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
              Dodaj Nowy Gatunek Drzewa
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nazwa polska */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-200 mb-2">
                Nazwa polska <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="np. Dąb szypułkowy"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Nazwa łacińska */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-slate-200 mb-2">
                Nazwa łacińska (naukowa)
              </label>
              <input
                type="text"
                value={formData.scientific_name}
                onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
                placeholder="np. Quercus robur"
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent italic"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Opcjonalne - nazwa naukowa gatunku
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-base py-4"
            >
              {loading ? 'Dodawanie...' : '✓ Dodaj Gatunek'}

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
