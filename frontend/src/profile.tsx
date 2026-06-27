import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as storage from './storage';

type ProfileCtx = {
  profile: storage.Profile | null | undefined;
  saveProfile: (p: storage.Profile) => Promise<void>;
};

const Ctx = createContext<ProfileCtx>({} as ProfileCtx);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<storage.Profile | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const p = await storage.getProfile();
      setProfile(p);
    })();
  }, []);

  const saveProfile = useCallback(async (p: storage.Profile) => {
    await storage.saveProfile(p);
    setProfile(p);
  }, []);

  return <Ctx.Provider value={{ profile, saveProfile }}>{children}</Ctx.Provider>;
}

export function useProfile() {
  return useContext(Ctx);
}
