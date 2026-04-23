// Web-only Leaflet component. Safe against SSR — imported only after mount.
import React, { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import { colors, wineTypeColors } from '../src/theme';

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

type Wine = {
  wine_id: string; name: string; wine_type: string; location_name?: string;
  latitude?: number | null; longitude?: number | null; rating?: number;
};

type Cluster = {
  key: string;
  lat: number;
  lng: number;
  wines: Wine[];
};

function makeSinglePin(color: string) {
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

function makeClusterPin(count: number, color: string) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
    <path d="M20 0C9 0 0 9 0 20c0 13 20 32 20 32s20-19 20-32C40 9 31 0 20 0z" fill="${color}"/>
    <circle cx="20" cy="20" r="11" fill="#fff"/>
    <text x="20" y="25" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="14" fill="${color}">${count}</text>
  </svg>`;
  return L.divIcon({
    className: 'wine-cluster',
    html: svg,
    iconSize: [40, 52],
    iconAnchor: [20, 52],
    popupAnchor: [0, -48],
  });
}

// Group wines that are within ~11m of each other (lat/lng rounded to 4 decimals).
function clusterize(wines: Wine[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const w of wines) {
    if (w.latitude == null || w.longitude == null) continue;
    const key = `${w.latitude.toFixed(4)}_${w.longitude.toFixed(4)}`;
    if (!map.has(key)) {
      map.set(key, { key, lat: w.latitude, lng: w.longitude, wines: [] });
    }
    map.get(key)!.wines.push(w);
  }
  return Array.from(map.values());
}

export default function LeafletMap({ wines }: { wines: Wine[] }) {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);

  const clusters = useMemo(() => clusterize(wines), [wines]);

  const center: [number, number] = clusters[0]
    ? [clusters[0].lat, clusters[0].lng]
    : [41.9, 12.5];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || clusters.length === 0) return;
    const bounds = L.latLngBounds(clusters.map(c => [c.lat, c.lng] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
  }, [clusters]);

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
      {clusters.map(cluster => {
        const first = cluster.wines[0];
        const color = wineTypeColors[first.wine_type] || colors.primary;
        const icon = cluster.wines.length > 1
          ? makeClusterPin(cluster.wines.length, colors.primary)
          : makeSinglePin(color);
        return (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={icon}
          >
            <Popup maxWidth={280}>
              <div style={{ minWidth: 200, maxWidth: 260 }}>
                {cluster.wines.length > 1 && (
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#7A7570', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {cluster.wines.length} degustazioni qui
                  </div>
                )}
                {cluster.wines.map((w, idx) => (
                  <div
                    key={w.wine_id}
                    style={{
                      paddingTop: idx === 0 ? 0 : 8,
                      paddingBottom: 8,
                      borderBottom: idx === cluster.wines.length - 1 ? 'none' : '1px solid #E3DEC7',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: wineTypeColors[w.wine_type] || colors.primary, display: 'inline-block' }} />
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#2C2A29' }}>{w.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#7A7570', marginTop: 2 }}>
                      {w.wine_type}{w.rating ? ` · ${'★'.repeat(w.rating)}` : ''}
                    </div>
                    {w.location_name ? (
                      <div style={{ fontSize: 12, color: '#7A7570' }}>{w.location_name}</div>
                    ) : null}
                    <button
                      onClick={() => router.push(`/wine/${w.wine_id}`)}
                      style={{
                        marginTop: 6, padding: '4px 12px', border: 'none',
                        background: colors.primary, color: '#fff', borderRadius: 20,
                        cursor: 'pointer', fontWeight: 600, fontSize: 11,
                      }}
                    >
                      Apri scheda
                    </button>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
