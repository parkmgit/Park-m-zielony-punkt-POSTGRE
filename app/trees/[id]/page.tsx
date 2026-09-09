'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, User, Building, Plus, Loader2, Camera, Bell, TreePine, Activity, Move } from 'lucide-react';
import { Tree, TreeAction, Photo } from '@/lib/types';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false });

export default function TreeDetailPage() {
  const params = useParams();
  const treeId = params.id as string;

  const [tree, setTree] = useState<Tree | null>(null);
  const [actions, setActions] = useState<TreeAction[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [photoModalLoading, setPhotoModalLoading] = useState(false);

  const [newAction, setNewAction] = useState({
    action_type: 'podlewanie',
    notes: '',
    next_watering_at: '',
    remind_before_hours: 24
  });

  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pendingLat, setPendingLat] = useState<number>(0);
  const [pendingLng, setPendingLng] = useState<number>(0);
  const [savingLocation, setSavingLocation] = useState(false);

  const toCloudinaryDisplayUrl = (url: string, forceJpg = false) => {
    if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

    const withImageUpload = url
      .replace('/raw/upload/', '/image/upload/')
      .replace('/video/upload/', '/image/upload/');

    const transform = forceJpg ? 'f_jpg,q_auto' : 'f_auto,q_auto';
    return withImageUpload.replace('/image/upload/', `/image/upload/${transform}/`);
  };

  useEffect(() => {
    fetchTreeData();
  }, [treeId]);

  const fetchTreeData = async () => {
    try {
      const [treeRes, actionsRes, photosRes] = await Promise.all([
        fetch(`/api/trees/${treeId}`),
        fetch(`/api/trees/${treeId}/actions`),
        fetch(`/api/photos?entity_type=tree&entity_id=${treeId}`)
      ]);

      const treeData = await treeRes.json();
      const actionsData = await actionsRes.json();
      const photosData = await photosRes.json();

      setTree(treeData);
      setActions(actionsData);
      setPhotos(photosData);
    } catch (error) {
      console.error('Error fetching tree data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewPhotos(prev => [...prev, ...filesArray]);
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      // Create action
      const actionRes = await fetch(`/api/trees/${treeId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAction)
      });

      if (!actionRes.ok) throw new Error('Failed to create action');

      const actionData = await actionRes.json();

      // Upload photos for this action
      for (const photo of newPhotos) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('entity_type', 'tree_action');
        formData.append('entity_id', actionData.id.toString());

        const photoRes = await fetch('/api/photos', {
          method: 'POST',
          body: formData
        });

        if (!photoRes.ok) {
          const errorData = await photoRes.json().catch(() => ({} as any));
          const fallbackMessage =
            photoRes.status === 413
              ? 'Zdjęcie jest za duże (max 10MB).'
              : photoRes.status === 415
                ? 'Nieobsługiwany typ pliku. Wybierz zdjęcie (JPG/PNG/HEIC itp.).'
                : 'Nieznany błąd';
          const msg =
            `Błąd przesyłania zdjęcia (HTTP ${photoRes.status}): ` +
            `${errorData?.error || fallbackMessage}` +
            `${errorData?.details ? `\nSzczegóły: ${errorData.details}` : ''}` +
            `${errorData?.requestId ? `\nrequestId: ${errorData.requestId}` : ''}`;
          throw new Error(msg);
        }
      }

      // Reset form
      setNewAction({ action_type: 'podlewanie', notes: '', next_watering_at: '', remind_before_hours: 24 });
      setNewPhotos([]);
      setPhotoPreview([]);
      setShowActionForm(false);

      // Refresh data
      fetchTreeData();
    } catch (error) {
      console.error('Error:', error);
      alert('Wystąpił błąd podczas dodawania akcji');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Drzewo nie znalezione</p>
          <Link href="/trees" className="text-green-600 hover:underline mt-4 inline-block">
            Powrót do listy
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posadzone': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'utrzymanie': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'wymiana': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'usuniete': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-white/10 text-white/40 border border-white/10';
    }
  };

  return (
    <div className="min-h-screen py-8 pb-28 md:pb-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/trees" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Powrót do listy drzew
        </Link>

        {/* Tree Details */}
        <div className="glass rounded-3xl p-8 gradient-border-green mb-6 animate-fade-in-up">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-black text-gradient-green mb-2">
                {tree.species_name || 'Nieznany gatunek'}
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tree.status)}`}>
                {tree.status}
              </span>
            </div>
            <div className="text-right text-xs text-white/25">
              ID: {tree.id}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
              <div>
                <p className="text-xs text-white/40">Budowa</p>
                <p className="font-semibold text-white text-sm">{tree.site_code} - {tree.site_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
              <div>
                <p className="text-xs text-white/40">Data posadzenia</p>
                <p className="font-semibold text-white text-sm">{new Date(tree.plant_date).toLocaleDateString('pl-PL')}</p>
              </div>
            </div>

            {tree.worker_name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/40">Wykonawca</p>
                  <p className="font-semibold text-white text-sm">{tree.worker_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-white/40">Lokalizacja GPS</p>
                <p className="font-medium text-xs text-white/70">
                  {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
                </p>
                <button
                  onClick={() => { setPendingLat(tree.latitude); setPendingLng(tree.longitude); setShowLocationPicker(true); }}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl transition-all hover:scale-105"
                  style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.35)',color:'#22c55e'}}
                >
                  <Move className="w-3 h-3" strokeWidth={2} /> Zmień położenie
                </button>
              </div>
            </div>
          </div>

          {tree.notes && (
            <div className="mt-4 p-4 glass rounded-2xl border border-white/10">
              <p className="text-xs text-white/40 mb-1">Notatki</p>
              <p className="text-white/70 text-sm">{tree.notes}</p>
            </div>
          )}

          {showLocationPicker && (
            <div className="mt-5 rounded-2xl overflow-hidden" style={{border:'1px solid rgba(34,197,94,0.3)'}}>
              <div className="px-4 py-2.5 flex items-center justify-between" style={{background:'rgba(34,197,94,0.08)'}}>
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4" style={{color:'#22c55e'}} />
                  <span className="text-sm font-bold" style={{color:'#22c55e'}}>Przećwiągnij pinezkę na nowe miejsce</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40 font-mono">{pendingLat.toFixed(6)}, {pendingLng.toFixed(6)}</span>
                </div>
              </div>
              <LocationPicker
                lat={tree.latitude}
                lng={tree.longitude}
                onChange={(lat, lng) => { setPendingLat(lat); setPendingLng(lng); }}
              />
              <div className="px-4 py-3 flex gap-2" style={{background:'rgba(4,6,15,0.8)'}}>
                <button
                  onClick={async () => {
                    setSavingLocation(true);
                    try {
                      const res = await fetch(`/api/trees/${treeId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude: pendingLat, longitude: pendingLng })
                      });
                      if (res.ok) {
                        setTree({ ...tree, latitude: pendingLat, longitude: pendingLng });
                        setShowLocationPicker(false);
                      } else { alert('Błąd zapisu'); }
                    } finally { setSavingLocation(false); }
                  }}
                  disabled={savingLocation}
                  className="flex items-center gap-2 font-bold text-sm text-white px-4 py-2 rounded-2xl disabled:opacity-50 transition-all hover:scale-105"
                  style={{background:'linear-gradient(135deg,#16a34a,#22c55e)',boxShadow:'0 4px 12px rgba(34,197,94,0.4)'}}
                >
                  {savingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  Zapisz nowe położenie
                </button>
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="px-4 py-2 rounded-2xl text-sm font-medium text-white/40 hover:text-white transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>

        {isPhotoModalOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setIsPhotoModalOpen(false)}
          >
            {photoModalLoading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            <img
              src={selectedPhoto}
              alt="Pełne zdjęcie"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onLoad={() => setPhotoModalLoading(false)}
              onError={() => {
                if (selectedPhoto.includes('res.cloudinary.com') && !selectedPhoto.includes('/f_jpg')) {
                  const forcedJpg = selectedPhoto.replace('/image/upload/', '/image/upload/f_jpg,q_auto/');
                  setSelectedPhoto(forcedJpg);
                  setPhotoModalLoading(true);
                  return;
                }
                setPhotoModalLoading(false);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Photos */}
        <div className="glass rounded-3xl gradient-border-green p-8 mb-6 animate-fade-in-up" style={{animationDelay:'0.1s'}}>
          <div className="flex items-center gap-2 mb-5">
            <Camera className="w-5 h-5 text-[#22c55e]" />
            <h2 className="text-lg font-bold text-white">Zdjęcia</h2>
          </div>
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative overflow-hidden rounded-2xl group/photo">
                  <img
                    src={toCloudinaryDisplayUrl(photo.url)}
                    alt="Zdjęcie drzewa"
                    className="w-full h-48 object-cover cursor-pointer group-hover/photo:scale-105 transition-transform duration-300"
                    onClick={() => {
                      const urlForModal = toCloudinaryDisplayUrl(photo.url);
                      setSelectedPhoto(urlForModal);
                      setPhotoModalLoading(true);
                      setIsPhotoModalOpen(true);
                    }}
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (img.dataset.fallbackTried === '1') return;
                      img.dataset.fallbackTried = '1';
                      img.src = toCloudinaryDisplayUrl(photo.url, true);
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                    {new Date(photo.taken_at).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-white/15 mx-auto mb-2" />
              <p className="text-white/30 text-sm">Brak zdjęć dla tego drzewa</p>
            </div>
          )}
        </div>

        {/* Actions History */}
        <div className="glass rounded-3xl gradient-border-green p-8 animate-fade-in-up" style={{animationDelay:'0.2s'}}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#22c55e]" />
              <h2 className="text-lg font-bold text-white">Historia Działań</h2>
            </div>
            <button
              onClick={() => setShowActionForm(!showActionForm)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-full hover:shadow-lg hover:shadow-green-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Dodaj Akcję
            </button>
          </div>

          {/* Add Action Form */}
          {showActionForm && (
            <form onSubmit={handleSubmitAction} className="mb-6 p-4 glass rounded-2xl border border-white/10">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">
                    Typ akcji
                  </label>
                  <select
                    value={newAction.action_type}
                    onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value })}
                    className="input-modern"
                  >
                    <option value="podlewanie">Podlewanie</option>
                    <option value="przyciecie">Przycięcie</option>
                    <option value="inspekcja">Inspekcja</option>
                    <option value="wymiana">Wymiana</option>
                    <option value="usuniecie">Usunięcie</option>
                  </select>
                </div>

                {newAction.action_type === 'podlewanie' && (
                  <div className="grid md:grid-cols-2 gap-4 rounded-2xl border border-green-500/25 p-4" style={{background:'rgba(34,197,94,0.06)'}}>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">
                        Następne podlewanie
                      </label>
                      <input
                        type="datetime-local"
                        value={newAction.next_watering_at}
                        onChange={(e) => setNewAction({ ...newAction, next_watering_at: e.target.value })}
                        className="input-modern"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/50 mb-1">
                        Powiadom ile godzin wcześniej
                      </label>
                      <select
                        value={newAction.remind_before_hours}
                        onChange={(e) => setNewAction({ ...newAction, remind_before_hours: Number(e.target.value) })}
                        className="input-modern"
                      >
                        <option value={0}>W dniu podlewania</option>
                        <option value={6}>6 godzin wczesniej</option>
                        <option value={12}>12 godzin wczesniej</option>
                        <option value={24}>1 dzien wczesniej</option>
                        <option value={48}>2 dni wczesniej</option>
                        <option value={72}>3 dni wczesniej</option>
                        <option value={168}>7 dni wczesniej</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-start gap-2 text-sm text-green-300">
                      <Bell className="w-4 h-4 mt-0.5" />
                      <span>Przypomnienie trafi do osoby zapisujacej to podlewanie.</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">
                    Notatki
                  </label>
                  <textarea
                    value={newAction.notes}
                    onChange={(e) => setNewAction({ ...newAction, notes: e.target.value })}
                    rows={3}
                    className="input-modern"
                    placeholder="Opis wykonanej akcji..."
                    style={{resize:'vertical'}}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1">
                    Zdjęcia (opcjonalnie)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoChange}
                    className="w-full"
                  />
                  {photoPreview.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {photoPreview.map((preview, index) => (
                        <img
                          key={index}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {actionLoading ? 'Zapisywanie...' : 'Zapisz Akcję'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionForm(false);
                      setNewPhotos([]);
                      setPhotoPreview([]);
                    }}
                    className="px-4 py-2 glass rounded-2xl text-white/40 hover:text-white border border-white/10 text-sm transition-colors"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Actions List */}
          <div className="space-y-2">
            {actions.length === 0 ? (
              <p className="text-center text-white/25 py-8 text-sm">Brak historii działań</p>
            ) : (
              actions.map((action) => (
                <div key={action.id} className="glass rounded-2xl px-4 py-3 border-l-4" style={{borderLeftColor:'#22c55e'}}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-sm capitalize">
                        {action.action_type}
                      </h3>
                      {action.notes && (
                        <p className="text-xs text-white/50 mt-1">{action.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40">{new Date(action.performed_at).toLocaleDateString('pl-PL')}</p>
                      <p className="text-xs text-[#22c55e]/70">{action.performer_name}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
