'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_number: '',
    name: '',
    location: '',
    client: '',
    trees_to_plant: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Błąd podczas dodawania projektu');
        return;
      }

      alert('Projekt został dodany pomyślnie!');
      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas dodawania projektu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót
        </Link>

        <div className="glass rounded-3xl p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gradient-green">Dodaj Nowy Projekt</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Numer Projektu */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Numer Projektu <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.project_number}
                onChange={(e) => setFormData({ ...formData, project_number: e.target.value })}
                required
                placeholder="np. PRJ-2025-001"
                className="input-modern"
              />
            </div>

            {/* Nazwa Projektu */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Nazwa Projektu <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="np. Rewitalizacja Parku Centralnego"
                className="input-modern"
              />
            </div>

            {/* Lokalizacja */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Lokalizacja
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="np. Warszawa, ul. Parkowa 15"
                className="input-modern"
              />
            </div>

            {/* Klient */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Klient
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="np. Urząd Miasta Warszawa"
                className="input-modern"
              />
            </div>

            {/* Ilość drzew do posadzenia */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Ilość drzew do posadzenia
              </label>
              <input
                type="number"
                value={formData.trees_to_plant}
                onChange={(e) => setFormData({ ...formData, trees_to_plant: parseInt(e.target.value) || 0 })}
                min="0"
                placeholder="0"
                className="input-modern"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-base py-4"
            >
              {loading ? 'Dodawanie...' : '✓ Dodaj Projekt'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
