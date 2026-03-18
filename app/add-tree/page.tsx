'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Camera, Loader2, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

interface Lookups {
  users: any[];
  projects: any[];
  sites: any[];
  species: any[];
  statuses: string[];
}

export default function AddTreePage() {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [bestAccuracy, setBestAccuracy] = useState<number>(Infinity);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    tree_number: '',
    species_id: '',
    site_id: '', // To będzie ID projektu (projekty działają jako sites)
    worker_id: '',
    plant_date: new Date().toISOString().split('T')[0],
    status: 'posadzone',
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    notes: '',
    created_by: 1 // Default to first user
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  useEffect(() => {
    // Fetch lookups
    fetch('/api/lookups')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded lookups:', data);
        setLookups(data);
      })
      .catch(err => {
        console.error('Error loading lookups:', err);
        alert('Błąd ładowania danych: ' + err.message);
      });
  }, []);

  const getGPSLocation = () => {
    setGpsLoading(true);
    setBestAccuracy(Infinity);
    
    if ('geolocation' in navigator) {
      // Użyj watchPosition - ciągłe monitorowanie dla najlepszej dokładności
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          
          // Aktualizuj tylko jeśli dokładność jest lepsza
          if (accuracy < bestAccuracy) {
            setFormData(prev => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy
            }));
            setBestAccuracy(accuracy);
            
            console.log('📍 Lepsza lokalizacja:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: accuracy.toFixed(1) + 'm'
            });
            
            // Jeśli dokładność < 10m, automatycznie zatrzymaj
            if (accuracy < 10) {
              console.log('✅ Doskonała dokładność osiągnięta!');
              navigator.geolocation.clearWatch(watchId);
              setGpsWatchId(null);
              setGpsLoading(false);
            }
          }
        },
        (error) => {
          console.error('GPS Error:', error);
          let errorMessage = 'Nie udało się pobrać lokalizacji. ';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Brak uprawnień do lokalizacji.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Lokalizacja niedostępna.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Timeout - spróbuj ponownie.';
              break;
            default:
              errorMessage += 'Nieznany błąd.';
          }
          
          alert(errorMessage);
          setGpsLoading(false);
        },
        {
          enableHighAccuracy: true,   // Używa GPS - dokładność 3-10m
          timeout: 30000,              // 30 sekund na znalezienie satelitów
          maximumAge: 0                // Zawsze pobieraj świeżą lokalizację
        }
      );
      
      setGpsWatchId(watchId);
      
      // Automatycznie zatrzymaj po 45 sekundach
      setTimeout(() => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
          setGpsWatchId(null);
          setGpsLoading(false);
          console.log('⏱️ Timeout - zatrzymano pobieranie GPS');
        }
      }, 45000);
    } else {
      alert('GPS nie jest dostępny w tej przeglądarce');
      setGpsLoading(false);
    }
  };
  
  const stopGPSTracking = () => {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      setGpsWatchId(null);
      setGpsLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...filesArray]);
      
      // Create previews
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
    
    if (formData.latitude === 0 || formData.longitude === 0) {
      alert('Pobierz lokalizację GPS przed zapisaniem');
      return;
    }


    setLoading(true);

    try {
      // Create tree
      const treeResponse = await fetch('/api/trees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!treeResponse.ok) throw new Error('Failed to create tree');

      const treeData = await treeResponse.json();
      const treeId = treeData.id;

      // Upload photos
      if (photos.length > 0) {
        console.log(`Uploading ${photos.length} photos for tree ${treeId}`);
        
        for (const photo of photos) {
          const formData = new FormData();
          formData.append('file', photo);
          formData.append('entity_type', 'tree');
          formData.append('entity_id', treeId.toString());

          const photoResponse = await fetch('/api/photos', {
            method: 'POST',
            body: formData
          });

          if (!photoResponse.ok) {
            const errorData = await photoResponse.json().catch(() => ({} as any));
            console.error('Failed to upload photo:', {
              status: photoResponse.status,
              errorData
            });
            alert(
              `Błąd przesyłania zdjęcia (HTTP ${photoResponse.status}): ` +
              `${errorData?.error || 'Nieznany błąd'}` +
              `${errorData?.details ? `\nSzczegóły: ${errorData.details}` : ''}` +
              `${errorData?.requestId ? `\nrequestId: ${errorData.requestId}` : ''}`
            );
          } else {
            const photoResult = await photoResponse.json();
            console.log('Photo uploaded successfully:', photoResult);
          }
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/trees');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas zapisywania drzewa');
    } finally {
      setLoading(false);
    }
  };

  if (!lookups) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Drzewo dodane!</h2>
          <p className="text-gray-600 dark:text-gray-300">Przekierowywanie do listy...</p>
        </div>
      </div>
    );
  }

  if (!lookups) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-green-600 dark:text-green-500 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-gray-600 dark:text-gray-300">Ładowanie formularza...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link href="/" className="inline-flex items-center text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Powrót
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dodaj Nowe Drzewo</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GPS Section */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-gray-700 dark:text-gray-200">Lokalizacja GPS</label>
                <div className="flex gap-2">
                  {gpsLoading && (
                    <button
                      type="button"
                      onClick={stopGPSTracking}
                      className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700"
                    >
                      Zatrzymaj
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={getGPSLocation}
                    disabled={gpsLoading}
                    className="flex items-center gap-2 bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-full hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    {gpsLoading ? 'Szukam...' : 'Pobierz GPS'}
                  </button>
                </div>
              </div>
              {formData.latitude !== 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  <p>Szerokość: {formData.latitude.toFixed(7)}</p>
                  <p>Długość: {formData.longitude.toFixed(7)}</p>
                  <p className={`font-semibold ${
                    formData.accuracy < 10 ? 'text-green-600 dark:text-green-400' :
                    formData.accuracy < 20 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    Dokładność: {formData.accuracy.toFixed(1)}m
                    {formData.accuracy < 10 && ' ✓ Doskonała'}
                    {formData.accuracy >= 10 && formData.accuracy < 20 && ' ⚠ Dobra'}
                    {formData.accuracy >= 20 && ' ⚠ Słaba - spróbuj ponownie'}
                  </p>
                  {gpsLoading && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      📡 Trwa poprawa dokładności... Poczekaj na sygnał &lt;10m
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Zdjęcia (opcjonalne)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-3xl p-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-input"
                />
                <label
                  htmlFor="photo-input"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">Kliknij aby dodać zdjęcia</span>
                </label>
              </div>
              
              {photoPreview.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {photoPreview.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
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

            {/* Tree Number */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Numer Drzewa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tree_number}
                onChange={(e) => setFormData({ ...formData, tree_number: e.target.value })}
                placeholder="np. D-001, DRZEWO-123"
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Species */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">Gatunek</label>
              <select
                value={formData.species_id}
                onChange={(e) => setFormData({ ...formData, species_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Wybierz gatunek (opcjonalnie)</option>
                {lookups.species?.map(species => (
                  <option key={species.id} value={species.id}>
                    {species.name}
                  </option>
                )) || []}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Projekt <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Wybierz projekt</option>
                {lookups.sites?.map(site => (
                  <option key={site.id} value={site.id}>
                    {site.project_number || site.code} - {site.name}
                  </option>
                )) || []}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Nie widzisz swojego projektu? <Link href="/add-project" className="text-green-600 dark:text-green-400 hover:underline">Dodaj nowy projekt</Link>
              </p>
            </div>

            {/* Worker */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">Wykonawca</label>
              <select
                value={formData.worker_id}
                onChange={(e) => setFormData({ ...formData, worker_id: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Wybierz wykonawcę (opcjonalnie)</option>
                {lookups.users?.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                )) || []}
              </select>
            </div>

            {/* Plant Date */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Data posadzenia <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.plant_date}
                onChange={(e) => setFormData({ ...formData, plant_date: e.target.value })}
                required
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {lookups.statuses?.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )) || []}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2">Notatki</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-3xl px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Dodatkowe informacje..."
              />
            </div>
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 dark:bg-green-700 text-white py-3 rounded-full font-semibold hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz Drzewo'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
