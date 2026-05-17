'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Profile } from './types';
import {
  loadProfiles,
  saveProfiles,
  loadActiveProfileId,
  saveActiveProfileId,
  clearActiveProfile,
  deleteProfileData,
  hashPin,
} from './storage';

interface ProfilesContextValue {
  profiles: Profile[];
  active: Profile | null;
  /** true когда мы только что прошли стартап-этап и знаем, есть ли профили */
  loaded: boolean;

  setActiveId: (id: string | null) => void;
  addProfile: (init: { name: string; avatar: string; pin?: string }) => Promise<Profile>;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  setProfilePin: (id: string, pin: string | null) => Promise<void>;
  deleteProfile: (id: string) => void;
  signOut: () => void;
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

function uuid(): string {
  // crypto.randomUUID требует secure context (https/localhost). Fallback для http://192.168.x.x.
  try {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
  } catch {}
  return `p-${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
}

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadProfiles()
      .then((list) => {
        if (cancelled) return;
        setProfiles(list);
        const active = loadActiveProfileId();
        if (active && list.some((p) => p.id === active)) {
          // На этом устройстве уже залогинены — PIN не переспрашиваем.
          setActiveIdState(active);
        } else if (list.length === 1 && !list[0].pinHash) {
          // Один профиль БЕЗ PIN — авто-вход (single-user, без защиты).
          // ВАЖНО: если PIN установлен — даже единственный профиль должен
          // пройти через ProfilePicker → PinPrompt. Иначе любой кто открыл
          // адрес Glance в браузере, попадёт сразу внутрь.
          setActiveIdState(list[0].id);
          saveActiveProfileId(list[0].id);
        }
        // Во всех остальных случаях (>1 профиля, или 1 профиль с PIN, или
        // 0 профилей) — activeId остаётся null, и UI покажет ProfilePicker
        // (или онбординг создания первого профиля).
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      // saveProfiles — асинхронный запрос на сервер
      saveProfiles(profiles).catch(() => {});
    }
  }, [profiles, loaded]);

  const setActiveId: ProfilesContextValue['setActiveId'] = useCallback((id) => {
    setActiveIdState(id);
    if (id) saveActiveProfileId(id);
    else clearActiveProfile();
  }, []);

  const addProfile: ProfilesContextValue['addProfile'] = useCallback(async ({ name, avatar, pin }) => {
    const id = uuid();
    const profile: Profile = {
      id,
      name,
      avatar,
      pinHash: pin ? await hashPin(pin) : null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProfiles((prev) => [...prev, profile]);
    setActiveIdState(id);
    saveActiveProfileId(id);
    return profile;
  }, []);

  const updateProfile: ProfilesContextValue['updateProfile'] = useCallback((id, patch) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p))
    );
  }, []);

  const setProfilePin: ProfilesContextValue['setProfilePin'] = useCallback(async (id, pin) => {
    const pinHash = pin ? await hashPin(pin) : null;
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pinHash, updatedAt: Date.now() } : p))
    );
  }, []);

  const deleteProfile: ProfilesContextValue['deleteProfile'] = useCallback(
    (id) => {
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      deleteProfileData(id);
      if (activeId === id) {
        setActiveIdState(null);
        clearActiveProfile();
      }
    },
    [activeId]
  );

  const signOut = useCallback(() => {
    setActiveIdState(null);
    clearActiveProfile();
  }, []);

  const active = profiles.find((p) => p.id === activeId) ?? null;

  return (
    <ProfilesContext.Provider
      value={{
        profiles,
        active,
        loaded,
        setActiveId,
        addProfile,
        updateProfile,
        setProfilePin,
        deleteProfile,
        signOut,
      }}
    >
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be inside <ProfilesProvider>');
  return ctx;
}
