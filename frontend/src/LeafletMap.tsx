// Web-only Leaflet component. Guard for SSR — this module is only imported after mount.
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { colors, wineTypeColors } from '../src/theme';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null;
};

function makePin(color: string) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 28 16 28s16-17 16-28C32 7.2 24.8 0 16 0z" fill="${color}"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    className: 'wine-pin',
    html: svg,
    iconSize: [32, 44],
    iconAnchor: [16, 44],
    popupAnchor: [0, -40],
  });
}

export default function LeafletMap({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);

  const center: [number, number] = wines[0]?.latitude != null && wines[0]?.longitude != null
    ? [wines[0].latitude as number, wines[0].longitude as number]
    : [41.9, 12.5];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || wines.length === 0) return;
    const bounds = L.latLngBounds(wines.map(w => [w.latitude!, w.longitude!] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [wines]);

  return (
    // @ts-ignore
    <MapContainer
      center={center}
      zoom={5}
      style={{ width: '100%', height: '100%' }}
      ref={(m: any) => { if (m) mapRef.current = m; }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {wines.map(w => (
        <Marker
          key={w.wine_id}
          position={[w.latitude!, w.longitude!]}
          icon={makePin(wineTypeColors[w.wine_type] || colors.primary)}
        >
          <Popup>
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#2C2A29' }}>{w.name}</div>
              <div style={{ fontSize: 12, color: '#7A7570', marginTop: 2 }}>{w.wine_type}</div>
              {w.location_name ? <div style={{ fontSize: 12, color: '#7A7570' }}>{w.location_name}</div> : null}
              <button
                onClick={() => router.push(`/wine/${w.wine_id}`)}
                style={{
                  marginTop: 8, padding: '6px 12px', border: 'none',
                  background: colors.primary, color: '#fff', borderRadius: 20,
                  cursor: 'pointer', fontWeight: 600, fontSize: 12,
                }}
              >
                Apri scheda
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
