import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = axios.create({ baseURL: `${BASE}/api`, withCredentials: true });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function setToken(token: string | null) {
  if (token) await AsyncStorage.setItem('access_token', token);
  else await AsyncStorage.removeItem('access_token');
}

export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('access_token');
}
