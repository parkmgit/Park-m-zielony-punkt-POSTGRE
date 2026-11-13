
'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2, Map, Satellite } from 'lucide-react';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPicker({
  lat,
  lng,
  onChange
}: LocationPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [mapLayer, setMapLayer] = useState<'satellite' | 'standard'>('satellite');

  const layersRef = useRef<{
    satellite: L.TileLayer;
    standard: L.TileLayer;
  } | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Inicjalizacja mapy
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      maxZoom: 22,
      zoomControl: true
    }).setView([lat, lng], 20);

    const satellite = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      {
        attribution: '© Google',
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }
    );

    const standard = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }
    );

    satellite.addTo(map);
    layersRef.current = { satellite, standard };

    const icon = L.divIcon({
      className: '',
      html: `<div style="cursor:grab;width:32px;height:40px">
        <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z"
            fill="#22c55e" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="12" r="5" fill="white" opacity="0.9"/>
        </svg>
      </div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 40]
    });

    const marker = L.marker([lat, lng], {
      icon,
      draggable: true
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onChangeRef.current(pos.lat, pos.lng);
    });

    map.on('click', (event: L.LeafletMouseEvent) => {
      marker.setLatLng(event.latlng);
      onChangeRef.current(event.latlng.lat, event.latlng.lng);
    });

    markerRef.current = marker;
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // Aktualizacja znacznika po zmianie współrzędnych w formularzu
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  // Wyszukiwanie lokalizacji
  const searchLocation = async () => {
    if (!search.trim()) return;

    setSearching(true);
    setError('');
    setResults([]);

    try {
      const params = new URLSearchParams({
        q: search.trim(),
        format: 'jsonv2',
        limit: '5',
        'accept-language': 'pl'
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResult[] = await response.json();

      setResults(data);

      if (data.length === 0) {
        setError('Nie znaleziono takiej lokalizacji.');
      }
    } catch {
      setError('Nie udało się wyszukać lokalizacji. Spróbuj ponownie.');
    } finally {
      setSearching(false);
    }
  };

  // Wybór lokalizacji
  const selectLocation = (result: SearchResult) => {
    const newLat = Number(result.lat);
    const newLng = Number(result.lon);

    markerRef.current?.setLatLng([newLat, newLng]);
    mapRef.current?.setView([newLat, newLng], 20);

    onChangeRef.current(newLat, newLng);

    setSearch(result.display_name);
    setResults([]);
  };

  // Zmiana warstwy mapy
  const toggleLayer = () => {
    const map = mapRef.current;
    const layers = layersRef.current;

    if (!map || !layers) return;

    if (mapLayer === 'satellite') {
      map.removeLayer(layers.satellite);
      map.addLayer(layers.standard);
      setMapLayer('standard');
    } else {
      map.removeLayer(layers.standard);
      map.addLayer(layers.satellite);
      setMapLayer('satellite');
    }
  };

  return (
    <div className="space-y-3">

      {/* Wyszukiwarka */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchLocation();
              }
            }}
            placeholder="Wpisz adres, ulicę lub miejsce..."
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />

          <button
            type="button"
            onClick={searchLocation}
            disabled={searching || !search.trim()}
            className="px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {searching
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Search className="w-5 h-5" />
            }
          </button>
        </div>

        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 z-[1000] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
            {results.map(result => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => selectLocation(result)}
                className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-white hover:bg-blue-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <MapPin className="w-4 h-4 inline mr-2 text-blue-500" />
                {result.display_name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>

      {/* Mapa */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[350px] rounded-xl overflow-hidden"
        />

        <button
          type="button"
          onClick={toggleLayer}
          className="absolute top-3 right-3 z-[1000] bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-lg text-sm font-semibold"
        >
          {mapLayer === 'satellite'
            ? <><Map className="w-4 h-4 inline mr-2" /> Mapa</>
            : <><Satellite className="w-4 h-4 inline mr-2" /> Satelita</>
          }
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <MapPin className="w-4 h-4 inline mr-1 text-green-500" />
        Kliknij mapę lub przeciągnij zielony znacznik, aby ustawić lokalizację drzewa.
      </p>
    </div>
  );
}
