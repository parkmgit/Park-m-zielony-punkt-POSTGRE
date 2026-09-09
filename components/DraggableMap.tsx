'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number;
  lng: number;
  onMove: (lat: number, lng: number) => void;
}

export default function DraggableMap({ lat, lng, onMove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onMoveRef = useRef(onMove);
  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    import('leaflet').then((L) => {
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!mapRef.current) {
        const map = L.map(containerRef.current!, { zoomControl: true }).setView([lat, lng], 19);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 22,
        }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
        marker.bindPopup('<b>Przeciągnij pin</b><br>aby dokładnie ustawić pozycję').openPopup();

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onMoveRef.current(
            Math.round(pos.lat * 1e7) / 1e7,
            Math.round(pos.lng * 1e7) / 1e7
          );
        });

        mapRef.current = map;
        markerRef.current = marker;
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 19);
    }
  }, [lat, lng]);

  return (
    <div className="mt-3">
      <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
        🗺️ Przeciągnij pin aby dokładnie ustawić pozycję drzewa na mapie
      </p>
      <div ref={containerRef} className="w-full h-52 rounded-2xl overflow-hidden border-2 border-green-400 dark:border-[#22c55e]" style={{ zIndex: 0 }} />
    </div>
  );
}
