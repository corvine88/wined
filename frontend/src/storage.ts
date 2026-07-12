import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomSubcategoriesMap, setCustomSubcategoriesMap } from './categories';

const WINES_KEY = 'wines';
const PROFILE_KEY = 'profile';
const SUGGESTED_KEY = 'suggested_wines';
const TUTORIAL_SEEN_KEY = 'tutorial_seen';
const AGE_CONSENT_KEY = 'age_consent';
const LANGUAGE_KEY = 'app_language';

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

export type SuggestedWine = Wine & {
  shared_by: string;
  received_at: string;
};

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

let winesCache: Wine[] | null = null;

export async function getWines(): Promise<Wine[]> {
  if (winesCache) return winesCache;
  const wines = await readJSON<Wine[]>(WINES_KEY, []);
  winesCache = wines.map((w) => ({ ...w, macro_category: w.macro_category || 'Vino' }));
  return winesCache;
}

export async function getWine(id: string): Promise<Wine | null> {
  const wines = await getWines();
  return wines.find((w) => w.wine_id === id) || null;
}

export async function createWine(input: Omit<Wine, 'wine_id' | 'created_at'>): Promise<Wine> {
  const wines = await getWines();
  const wine: Wine = { ...input, wine_id: generateId(), created_at: new Date().toISOString() };
  winesCache = [wine, ...wines];
  await writeJSON(WINES_KEY, winesCache);
  return wine;
}

export async function updateWine(id: string, input: Omit<Wine, 'wine_id' | 'created_at'>): Promise<void> {
  const wines = await getWines();
  const idx = wines.findIndex((w) => w.wine_id === id);
  if (idx === -1) return;
  winesCache = wines.map((w, i) => (i === idx ? { ...w, ...input } : w));
  await writeJSON(WINES_KEY, winesCache);
}

export async function deleteWine(id: string): Promise<void> {
  const wines = await getWines();
  winesCache = wines.filter((w) => w.wine_id !== id);
  await writeJSON(WINES_KEY, winesCache);
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
  winesCache = null;
  await AsyncStorage.multiRemove([WINES_KEY, PROFILE_KEY, 'custom_subcategories', SUGGESTED_KEY, TUTORIAL_SEEN_KEY, AGE_CONSENT_KEY]);
}

export async function getAgeConsent(): Promise<boolean> {
  return (await AsyncStorage.getItem(AGE_CONSENT_KEY)) === 'true';
}

export async function setAgeConsent(): Promise<void> {
  await AsyncStorage.setItem(AGE_CONSENT_KEY, 'true');
}

export async function getLanguagePreference(): Promise<string | null> {
  return AsyncStorage.getItem(LANGUAGE_KEY);
}

export async function setLanguagePreference(lang: string | null): Promise<void> {
  if (lang) await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  else await AsyncStorage.removeItem(LANGUAGE_KEY);
}

export async function getTutorialSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(TUTORIAL_SEEN_KEY)) === 'true';
}

export async function setTutorialSeen(): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
}

export async function getSuggestedWines(): Promise<SuggestedWine[]> {
  return readJSON<SuggestedWine[]>(SUGGESTED_KEY, []);
}

export async function saveSuggestedWine(wine: Wine, sharedBy: string): Promise<SuggestedWine> {
  const suggested = await getSuggestedWines();
  const entry: SuggestedWine = {
    ...wine,
    wine_id: generateId(),
    shared_by: sharedBy,
    received_at: new Date().toISOString(),
  };
  await writeJSON(SUGGESTED_KEY, [entry, ...suggested]);
  return entry;
}

export async function deleteSuggestedWine(id: string): Promise<void> {
  const suggested = await getSuggestedWines();
  await writeJSON(SUGGESTED_KEY, suggested.filter((w) => w.wine_id !== id));
}

export type BackupPayload = {
  version: '1.0';
  exported_at: string;
  profile: Profile | null;
  wines: Wine[];
  custom_subcategories: Record<string, string[]>;
};

export async function exportBackupPayload(): Promise<BackupPayload> {
  const [profile, wines, custom_subcategories] = await Promise.all([
    getProfile(),
    getWines(),
    getCustomSubcategoriesMap(),
  ]);
  return { version: '1.0', exported_at: new Date().toISOString(), profile, wines, custom_subcategories };
}

export async function importBackupPayload(payload: BackupPayload): Promise<void> {
  winesCache = payload.wines || [];
  await Promise.all([
    writeJSON(WINES_KEY, winesCache),
    payload.profile ? saveProfile(payload.profile) : Promise.resolve(),
    setCustomSubcategoriesMap(payload.custom_subcategories || {}),
  ]);
}
