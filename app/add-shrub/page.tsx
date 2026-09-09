'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shrub } from 'lucide-react';
import Link from 'next/link';

export default function AddShrubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [lookups, setLookups] = useState<any>({ users: [], sites: [], species: [] });
  const [formData, setFormData] = useState({
    site_id: '',
    species_id: '',
    quantity: '1',
    plant_date: new Date().toISOString().split('T')[0],
    worker_id: '',
    status: 'posadzone',
    notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/lookups').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([lookupsData, me]) => {
      setLookups(lookupsData);
      if (me?.id) setFormData(prev => ({ ...prev, worker_id: String(me.id) }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/shrubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          site_id: Number(formData.site_id),
          species_id: Number(formData.species_id),
          quantity: Number(formData.quantity),
          worker_id: formData.worker_id ? Number(formData.worker_id) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Błąd podczas dodawania');
        return;
      }
      router.push('/shrubs');
    } catch (err) {
      alert('Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/shrubs" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót do krzewów
        </Link>

        <div className="glass rounded-3xl p-6 md:p-8 gradient-border-green">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lime-500 to-green-600 flex items-center justify-center">
              <Shrub className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gradient-green">Dodaj Krzewy / Nasadzenie zbiorcze</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Projekt/Miejsce */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Miejsce <span className="text-red-500">*</span></label>
              <select value={formData.site_id} onChange={e => setFormData({ ...formData, site_id: e.target.value })} required className="input-modern">
                <option value="">— wybierz miejsce —</option>
                {lookups.sites?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                ))}
              </select>
            </div>

            {/* Gatunek */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Gatunek <span className="text-red-500">*</span></label>
              <select value={formData.species_id} onChange={e => setFormData({ ...formData, species_id: e.target.value })} required className="input-modern">
                <option value="">— wybierz gatunek —</option>
                {lookups.species?.map((sp: any) => (
                  <option key={sp.id} value={sp.id}>{sp.name}{sp.scientific_name ? ` (${sp.scientific_name})` : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-white/25 mt-1">Brak gatunku? <Link href="/add-species" className="text-green-400 hover:underline">Dodaj nowy gatunek</Link></p>
            </div>

            {/* Ilość */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Ilość sztuk <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                required
                className="input-modern"
                placeholder="np. 50"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Data <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={formData.plant_date}
                onChange={e => setFormData({ ...formData, plant_date: e.target.value })}
                required
                className="input-modern"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Status</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="input-modern">
                <option value="posadzone">Posadzone</option>
                <option value="utrzymanie">Utrzymanie</option>
                <option value="wymiana">Wymiana</option>
                <option value="usuniete">Usunięte</option>
              </select>
            </div>

            {/* Wykonawca */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Wykonawca</label>
              <select value={formData.worker_id} onChange={e => setFormData({ ...formData, worker_id: e.target.value })} className="input-modern">
                <option value="">— brak wykonawcy —</option>
                {lookups.users?.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-white/25 mt-1">Domyślnie: zalogowany użytkownik — możesz zmienić</p>
            </div>

            {/* Notatki */}
            <div>
              <label className="block text-xs font-black text-white/50 uppercase tracking-widest mb-2">Notatki</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="input-modern resize-none"
                placeholder="Dodatkowe informacje..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl font-black text-white text-sm tracking-wide disabled:opacity-50 transition-all hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}
            >
              {loading ? 'Zapisywanie...' : '✓ Dodaj Nasadzenie'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
