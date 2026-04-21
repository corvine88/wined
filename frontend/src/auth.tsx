import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

export type User = {
  user_id: string;
  email: string;
  name?: string;
  picture?: string;
  auth_provider?: string;
};

type AuthCtx = {
  user: User | null | undefined; // undefined = loading
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithSessionId: (session_id: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/auth/me');
      setUser(r.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    if (r.data.access_token) await setToken(r.data.access_token);
    setUser(r.data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const r = await api.post('/auth/register', { email, password, name });
    if (r.data.access_token) await setToken(r.data.access_token);
    setUser(r.data.user);
  };

  const loginWithSessionId = async (session_id: string) => {
    const r = await api.post('/auth/session', { session_id });
    if (r.data.access_token) await setToken(r.data.access_token);
    setUser(r.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, login, register, loginWithSessionId, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
