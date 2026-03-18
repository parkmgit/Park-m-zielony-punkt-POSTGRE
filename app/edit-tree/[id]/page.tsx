'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Save } from 'lucide-react';

export default function EditTreePage() {
  const router = useRouter();
  const params = useParams();
  const treeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);
  const [lookups, setLookups] = useState<any>({
    sites: [],
    species: [],
    workers: [],
    users: []
  });

  const [formData, setFormData] = useState({
    tree_number: '',
    species_id: '',
    site_id: '',
    worker_id: '',
    plant_date: '',
    status: 'posadzone',
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    notes: '',
    created_by: 0
  });

  useEffect(() => {
    // Load tree data and lookups
    Promise.all([
      fetch(`/api/trees/${treeId}`).then(res => res.json()),
      fetch('/api/lookups').then(res => res.json())
    ])
      .then(([treeData, lookupsData]) => {
        setFormData({
          tree_number: treeData.tree_number || '',
          species_id: treeData.species_id || '',
          site_id: treeData.site_id || '',
          worker_id: treeData.worker_id || '',
          plant_date: treeData.plant_date || '',
          status: treeData.status || 'posadzone',
          latitude: treeData.latitude || 0,
          longitude: treeData.longitude || 0,
          accuracy: treeData.accuracy || 0,
          notes: treeData.notes || '',
          created_by: treeData.created_by || 0
        });
        setLookups(lookupsData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        alert('Błąd ładowania danych');
        setLoading(false);
      });
  }, [treeId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...filesArray]);

      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/trees/${treeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        if (photos.length > 0) {
          for (const photo of photos) {
            const uploadData = new FormData();
            uploadData.append('file', photo);
            uploadData.append('entity_type', 'tree');
            uploadData.append('entity_id', treeId);

            const photoResponse = await fetch('/api/photos', {
              method: 'POST',
              body: uploadData
            });

            if (!photoResponse.ok) {
              const errorData = await photoResponse.json().catch(() => ({}));
              alert(`Błąd przesyłania zdjęcia: ${errorData?.error || 'Nieznany błąd'}`);
            }
          }
        }
        alert('Drzewo zaktualizowane!');
        router.push('/trees');
      } else {
        const error = await response.json();
        alert('Błąd: ' + error.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/trees" className="inline-flex items-center text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Powrót do listy
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Edytuj Drzewo #{treeId}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Numer drzewa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Numer drzewa (opcjonalnie)
              </label>
              <input
                type="text"
                value={formData.tree_number}
                onChange={(e) => setFormData({ ...formData, tree_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
                placeholder="np. D-001"
              />
            </div>

            {/* Budowa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budowa *
              </label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
                required
              >
                <option value="">Wybierz budowę</option>
                {lookups.sites?.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.code} - {site.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gatunek */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gatunek
              </label>
              <select
                value={formData.species_id}
                onChange={(e) => setFormData({ ...formData, species_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
              >
                <option value="">Wybierz gatunek</option>
                {lookups.species?.map((species: any) => (
                  <option key={species.id} value={species.id}>
                    {species.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Wykonawca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wykonawca
              </label>
              <select
                value={formData.worker_id}
                onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
              >
                <option value="">Wybierz wykonawcę</option>
                {lookups.workers?.map((worker: any) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Data posadzenia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data posadzenia *
              </label>
              <input
                type="date"
                value={formData.plant_date}
                onChange={(e) => setFormData({ ...formData, plant_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full"
                required
              >
                <option value="posadzone">Posadzone</option>
                <option value="utrzymanie">Utrzymanie</option>
                <option value="wymiana">Wymiana</option>
                <option value="usuniete">Usunięte</option>
              </select>
            </div>

            {/* Lokalizacja GPS */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-800 dark:text-white">Lokalizacja GPS</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Szerokość</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Długość</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              {formData.accuracy > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Dokładność: ±{formData.accuracy.toFixed(1)}m
                </p>
              )}
            </div>

            {/* Notatki */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notatki
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl"
                rows={4}
                placeholder="Dodatkowe informacje..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dodaj zdjęcia
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-2xl"
              />

              {photoPreview.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {photoPreview.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Przyciski */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
              <Link
                href="/trees"
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold"
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
