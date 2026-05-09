'use client';

import { ReactNode, createContext, useContext } from 'react';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { verifyPin as verifyPinHash } from '@/lib/profiles/storage';

interface SecurityContextValue {
  /** Включена ли защита (у активного профиля задан PIN) */
  enabled: boolean;
  /** Проверить введённый PIN против активного профиля.
   *  true если PIN не настроен (защиты нет) ИЛИ совпадает. */
  verifyPin: (pin: string) => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

/**
 * Защита деструктивных действий через **PIN активного профиля**, тот самый,
 * что был задан при создании профиля. Отдельного «админ-PIN» нет — это лишняя
 * сущность для пользователя, проще переиспользовать профильный.
 */
export function SecurityProvider({ children }: { children: ReactNode }) {
  const { active } = useProfiles();
  const enabled = !!active?.pinHash;

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!active?.pinHash) return true; // нет защиты — пропускаем
    return verifyPinHash(pin, active.pinHash);
  };

  return (
    <SecurityContext.Provider value={{ enabled, verifyPin }}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used inside <SecurityProvider>');
  return ctx;
}
