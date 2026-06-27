import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api, setToken, getToken } from './api';

export type User = {
  user_id: string;
  email: string;
  name?: string;
  picture?: string;
  auth_provider?: string;
};

type AuthCtx = {
  user: User | null | undefined;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithSessionId: (session_id: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const PLACEHOLDER_USER: User = { user_id: '_pending', email: '', auth_provider: 'email' };
const INIT_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const settledRef = useRef(false);

  const settle = useCallback((u: User | null) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setUser(u);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/auth/me');
      settledRef.current = true;
      setUser(r.data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        await setToken(null);
        settle(null);
      }
    }
  }, [settle]);

  useEffect(() => {
    let cancelled = false;

    const safety = setTimeout(() => {
      if (cancelled || settledRef.current) return;
      settle(null);
    }, INIT_TIMEOUT_MS);

    (async () => {
      try {
        const token = await getToken();
        if (cancelled || settledRef.current) return;
        if (token) {
          settledRef.current = true;
          setUser(PLACEHOLDER_USER);
          refresh();
        } else {
          settle(null);
        }
      } catch {
        settle(null);
      } finally {
        clearTimeout(safety);
      }
    })();

    return () => { cancelled = true; clearTimeout(safety); };
  }, [refresh, settle]);

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    if (r.data.access_token) await setToken(r.data.access_token);
    settledRef.current = true;
    setUser(r.data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const r = await api.post('/auth/register', { email, password, name });
    if (r.data.access_token) await setToken(r.data.access_token);
    settledRef.current = true;
    setUser(r.data.user);
  };

  const loginWithSessionId = async (session_id: string) => {
    const r = await api.post('/auth/session', { session_id });
    if (r.data.access_token) await setToken(r.data.access_token);
    settledRef.current = true;
    setUser(r.data.user);
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    await setToken(null);
    settledRef.current = true;
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
