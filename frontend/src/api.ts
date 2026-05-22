import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = 'access_token';

export const api = axios.create({
  baseURL: `${BASE}/api`,
  withCredentials: true,
  timeout: 10000, // 10s — evita hang infinito su backend irraggiungibile
});

function webStorageGet(): string | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(TOKEN_KEY);
  } catch {}
  return null;
}

function webStorageSet(token: string | null) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// Race a promise against a timeout. If it doesn't resolve in time, returns fallback.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return webStorageGet();
  // AsyncStorage può non rispondere mai su Android in alcuni stati (es. dopo splash) → metti un timeout
  try {
    return await withTimeout(AsyncStorage.getItem(TOKEN_KEY), 3000, null);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null) {
  if (Platform.OS === 'web') {
    webStorageSet(token);
    return;
  }
  try {
    if (token) await withTimeout(AsyncStorage.setItem(TOKEN_KEY, token), 3000, undefined);
    else await withTimeout(AsyncStorage.removeItem(TOKEN_KEY), 3000, undefined);
  } catch {}
}

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
