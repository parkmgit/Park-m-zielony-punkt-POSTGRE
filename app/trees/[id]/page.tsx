'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, User, Building, Plus, Loader2, Camera } from 'lucide-react';
import { Tree, TreeAction, Photo } from '@/lib/types';

export default function TreeDetailPage() {
  const params = useParams();
  const treeId = params.id as string;

  const [tree, setTree] = useState<Tree | null>(null);
  const [actions, setActions] = useState<TreeAction[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [newAction, setNewAction] = useState({
    action_type: 'podlewanie',
    notes: '',
    performed_by: 1
  });

  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

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
        formData.append('taken_by', '1');

        await fetch('/api/photos', {
          method: 'POST',
          body: formData
        });
      }

      // Reset form
      setNewAction({ action_type: 'podlewanie', notes: '', performed_by: 1 });
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
      case 'posadzone': return 'bg-green-100 text-green-800';
      case 'utrzymanie': return 'bg-blue-100 text-blue-800';
      case 'wymiana': return 'bg-yellow-100 text-yellow-800';
      case 'usuniete': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/trees" className="inline-flex items-center text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Powrót do listy
        </Link>

        {/* Tree Details */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {tree.species_name || 'Nieznany gatunek'}
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tree.status)}`}>
                {tree.status}
              </span>
            </div>
            <div className="text-right text-sm text-gray-500">
              ID: {tree.id}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Building className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Budowa</p>
                <p className="font-medium">{tree.site_code} - {tree.site_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Data posadzenia</p>
                <p className="font-medium">{new Date(tree.plant_date).toLocaleDateString('pl-PL')}</p>
              </div>
            </div>

            {tree.worker_name && (
              <div className="flex items-center gap-2 text-gray-700">
                <User className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Wykonawca</p>
                  <p className="font-medium">{tree.worker_name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Lokalizacja GPS</p>
                <p className="font-medium text-xs">
                  {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {tree.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Notatki</p>
              <p className="text-gray-700">{tree.notes}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Zdjęcia</h2>
          {photos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt="Tree photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg">
                    {new Date(photo.taken_at).toLocaleDateString('pl-PL')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Brak zdjęć dla tego drzewa</p>
            </div>
          )}
        </div>

        {/* Actions History */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Historia Działań</h2>
            <button
              onClick={() => setShowActionForm(!showActionForm)}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Dodaj Akcję
            </button>
          </div>

          {/* Add Action Form */}
          {showActionForm && (
            <form onSubmit={handleSubmitAction} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typ akcji
                  </label>
                  <select
                    value={newAction.action_type}
                    onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="podlewanie">Podlewanie</option>
                    <option value="przyciecie">Przycięcie</option>
                    <option value="inspekcja">Inspekcja</option>
                    <option value="wymiana">Wymiana</option>
                    <option value="usuniecie">Usunięcie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notatki
                  </label>
                  <textarea
                    value={newAction.notes}
                    onChange={(e) => setNewAction({ ...newAction, notes: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Opis wykonanej akcji..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Actions List */}
          <div className="space-y-4">
            {actions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Brak historii działań</p>
            ) : (
              actions.map((action) => (
                <div key={action.id} className="border-l-4 border-green-500 pl-4 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800 capitalize">
                        {action.action_type}
                      </h3>
                      {action.notes && (
                        <p className="text-sm text-gray-600 mt-1">{action.notes}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{new Date(action.performed_at).toLocaleDateString('pl-PL')}</p>
                      <p>{action.performer_name}</p>
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
