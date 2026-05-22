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
  bootLogs: string[];
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

const PLACEHOLDER_USER: User = { user_id: '_pending', email: '', auth_provider: 'email' };
const INIT_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const settledRef = useRef(false);

  const log = (msg: string) => {
    const line = `[auth] ${msg}`;
    console.log(line);
    setBootLogs((prev) => [...prev, line]);
  };

  const settle = useCallback((u: User | null, reason: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    log(`settle(${u === null ? 'null' : 'user'}) — ${reason}`);
    setUser(u);
  }, []);

  const refresh = useCallback(async () => {
    try {
      log('refresh: GET /auth/me');
      const r = await api.get('/auth/me');
      log(`refresh: /auth/me → ${r.status}`);
      settledRef.current = true;
      setUser(r.data);
    } catch (e: any) {
      log(`refresh: error ${e?.response?.status || ''} ${e?.message || ''}`);
      if (e?.response?.status === 401) {
        await setToken(null);
        settle(null, '401 from /me');
      }
    }
  }, [settle]);

  useEffect(() => {
    let cancelled = false;
    log('AuthProvider mount');

    const safety = setTimeout(() => {
      if (cancelled || settledRef.current) return;
      settle(null, 'safety timeout 5s');
    }, INIT_TIMEOUT_MS);

    (async () => {
      try {
        log('calling getToken()');
        const token = await getToken();
        log(`getToken() done → ${token ? 'present' : 'absent'}`);
        if (cancelled || settledRef.current) return;
        if (token) {
          settledRef.current = true;
          log('token present → set placeholder, refresh in bg');
          setUser(PLACEHOLDER_USER);
          refresh();
        } else {
          settle(null, 'no token');
        }
      } catch (e: any) {
        log(`init error: ${e?.message || String(e)}`);
        settle(null, 'init error');
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
    <Ctx.Provider value={{ user, login, register, loginWithSessionId, logout, refresh, bootLogs }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
