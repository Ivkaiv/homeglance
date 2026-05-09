'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { hasCredentials, initialized, status } = useConnection();
  const { active, loaded: profilesLoaded } = useProfiles();

  useEffect(() => {
    // Не редиректим, пока не прочитали localStorage — иначе теряем сессию на refresh
    if (initialized && !hasCredentials) router.replace('/onboarding');
  }, [initialized, hasCredentials, router]);

  if (!initialized) {
    return <DashboardSkeleton />;
  }

  if (!hasCredentials) return null;

  if (status.status === 'connecting' || status.status === 'idle') {
    return <DashboardSkeleton hint="Подключаюсь к Home Assistant…" />;
  }

  if (status.status === 'auth-failed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-6 max-w-md w-full text-center flex flex-col items-center gap-3">
          <AlertCircle size={32} className="text-red-400" aria-hidden="true" />
          <div className="text-base font-medium text-text-primary">
            Неверный токен Home Assistant
          </div>
          <div className="text-sm text-text-secondary">
            Токен устарел или был отозван. Создайте новый в профиле HA и вставьте на странице
            настройки подключения.
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="mt-1 px-5 py-2.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-sm hover:bg-accent/30"
          >
            Перенастроить подключение
          </button>
        </div>
      </div>
    );
  }

  if (!profilesLoaded) {
    return <DashboardSkeleton hint="Загрузка профилей…" />;
  }

  if (!active) {
    return <ProfilePicker />;
  }

  return <Dashboard />;
}
