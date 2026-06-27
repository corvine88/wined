import AsyncStorage from '@react-native-async-storage/async-storage';

const WINES_KEY = 'wines';
const PROFILE_KEY = 'profile';

export type Wine = {
  wine_id: string;
  name: string;
  macro_category: string;
  wine_type: string;
  location_name?: string;
  latitude?: number | null;
  longitude?: number | null;
  rating: number;
  front_photo?: string;
  back_photo?: string;
  glass_photo?: string;
  notes?: string;
  created_at?: string;
};

export type Profile = { name: string; picture?: string };

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getWines(): Promise<Wine[]> {
  const wines = await readJSON<Wine[]>(WINES_KEY, []);
  return wines.map((w) => ({ ...w, macro_category: w.macro_category || 'Vino' }));
}

export async function getWine(id: string): Promise<Wine | null> {
  const wines = await getWines();
  return wines.find((w) => w.wine_id === id) || null;
}

export async function createWine(input: Omit<Wine, 'wine_id' | 'created_at'>): Promise<Wine> {
  const wines = await getWines();
  const wine: Wine = { ...input, wine_id: generateId(), created_at: new Date().toISOString() };
  wines.unshift(wine);
  await writeJSON(WINES_KEY, wines);
  return wine;
}

export async function updateWine(id: string, input: Omit<Wine, 'wine_id' | 'created_at'>): Promise<void> {
  const wines = await getWines();
  const idx = wines.findIndex((w) => w.wine_id === id);
  if (idx === -1) return;
  wines[idx] = { ...wines[idx], ...input };
  await writeJSON(WINES_KEY, wines);
}

export async function deleteWine(id: string): Promise<void> {
  const wines = await getWines();
  await writeJSON(WINES_KEY, wines.filter((w) => w.wine_id !== id));
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function getNearbyLocationNames(lat: number, lng: number, radiusM = 200): Promise<string[]> {
  const wines = await getWines();
  const names = new Set<string>();
  for (const w of wines) {
    if (w.latitude == null || w.longitude == null || !w.location_name) continue;
    if (distanceMeters(lat, lng, w.latitude, w.longitude) <= radiusM) names.add(w.location_name);
  }
  return Array.from(names);
}

export async function getProfile(): Promise<Profile | null> {
  return readJSON<Profile | null>(PROFILE_KEY, null);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await writeJSON(PROFILE_KEY, profile);
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([WINES_KEY, PROFILE_KEY, 'custom_subcategories']);
}
