'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Tree } from '@/lib/types';

interface TreeMapProps {
  trees: Tree[];
  onTreeClick?: (tree: Tree) => void;
  externalLayer?: 'standard' | 'satellite';
  onLayerToggle?: () => void;
}

export default function TreeMap({ trees, onTreeClick, externalLayer, onLayerToggle }: TreeMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLayer, setMapLayer] = useState<'standard' | 'satellite'>('satellite');
  const layersRef = useRef<{ standard: L.TileLayer; satellite: L.TileLayer } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map with higher max zoom
    const map = L.map(mapContainerRef.current, {
      maxZoom: 22,
      zoomControl: true
    }).setView([52.2297, 21.0122], 18); // Warsaw center, higher zoom

    // Standard map layer - OpenStreetMap
    const standardLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    });

    // Satellite layer - Google Satellite (najlepsza jakość i dokładność)
    const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '© Google',
      maxZoom: 22,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });

    // Add satellite layer by default
    satelliteLayer.addTo(map);

    layersRef.current = { standard: standardLayer, satellite: satelliteLayer };
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || trees.length === 0) return;

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Create custom pin icons based on status
    const getIcon = (status: string) => {
      const colors: Record<string, string> = {
        posadzone: '#22c55e',    // Zielony - posadzone
        utrzymanie: '#3b82f6',   // Niebieski - utrzymanie
        wymiana: '#eab308',      // Żółty - wymiana
        usuniete: '#ef4444'      // Czerwony - usunięte
      };

      const color = colors[status] || '#6b7280';

      return L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 40px;
          ">
            <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <!-- Pin shape -->
              <path d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" 
                    fill="${color}" 
                    stroke="white" 
                    stroke-width="2"/>
              <!-- Inner circle -->
              <circle cx="16" cy="12" r="5" fill="white" opacity="0.9"/>
              <!-- Tree emoji -->
              <text x="16" y="16" text-anchor="middle" font-size="10" fill="${color}">🌳</text>
            </svg>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
      });
    };

    // Add markers for each tree
    const bounds: [number, number][] = [];

    trees.forEach((tree) => {
      const marker = L.marker([tree.latitude, tree.longitude], {
        icon: getIcon(tree.status)
      }).addTo(mapRef.current!);

      // Add accuracy circle if available - kolor mapy (zielony/szary)
      if (tree.accuracy && tree.accuracy > 0) {
        L.circle([tree.latitude, tree.longitude], {
          radius: tree.accuracy,
          color: '#22c55e',      // Zielony - kolor mapy
          fillColor: '#22c55e',  // Zielony - kolor mapy
          fillOpacity: 0.15,     // Trochę bardziej widoczny
          weight: 2
        }).addTo(mapRef.current!);
      }

      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">
            ${tree.species_name || 'Nieznany gatunek'}
          </h3>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Budowa:</strong> ${tree.site_code}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Status:</strong> ${tree.status}
          </p>
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Data:</strong> ${new Date(tree.plant_date).toLocaleDateString('pl-PL')}
          </p>
          ${tree.accuracy ? `
          <p style="margin: 4px 0; font-size: 12px;">
            <strong>Dokładność GPS:</strong> ${tree.accuracy.toFixed(1)}m
          </p>
          ` : ''}
          <p style="margin: 4px 0; font-size: 11px; color: #666;">
            📍 ${tree.latitude.toFixed(7)}, ${tree.longitude.toFixed(7)}
          </p>
          <a href="/trees/${tree.id}" style="
            display: inline-block;
            margin-top: 8px;
            padding: 4px 12px;
            background-color: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
          ">
            Zobacz szczegóły
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onTreeClick) {
        marker.on('click', () => onTreeClick(tree));
      }

      bounds.push([tree.latitude, tree.longitude]);
    });

    // Fit map to show all markers with higher zoom
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        // Single marker - zoom in close
        mapRef.current.setView(bounds[0] as L.LatLngExpression, 20);
      } else {
        mapRef.current.fitBounds(bounds as L.LatLngBoundsLiteral, { 
          padding: [50, 50],
          maxZoom: 18
        });
      }
    }
  }, [trees, onTreeClick]);

  useEffect(() => {
    if (!mapRef.current || !layersRef.current || externalLayer === undefined) return;
    if (externalLayer !== mapLayer) {
      mapRef.current.removeLayer(layersRef.current[mapLayer]);
      mapRef.current.addLayer(layersRef.current[externalLayer]);
      setMapLayer(externalLayer);
    }
  }, [externalLayer]);

  const toggleMapLayer = () => {
    if (!mapRef.current || !layersRef.current) return;
    
    const newLayer = mapLayer === 'standard' ? 'satellite' : 'standard';
    
    // Remove current layer
    mapRef.current.removeLayer(layersRef.current[mapLayer]);
    
    // Add new layer
    mapRef.current.addLayer(layersRef.current[newLayer]);
    
    setMapLayer(newLayer);
  };

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
        className="rounded-lg overflow-hidden"
      />
      
      {/* Wewnętrzny toggle - ukryty gdy rodzic kontroluje warstwę */}
      {!onLayerToggle && (
        <button
          onClick={toggleMapLayer}
          className="absolute top-4 right-4 z-[9999] bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-xl hover:shadow-2xl transition-all text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400"
          style={{ pointerEvents: 'auto' }}
        >
          {mapLayer === 'satellite' ? '🗺️ Mapa' : '🛰️ Satelita'}
        </button>
      )}
    </div>
  );
}
