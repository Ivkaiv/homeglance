'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { useT } from '@/lib/i18n/I18nProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const t = useT();
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
    return <DashboardSkeleton hint={t('connection.connecting')} />;
  }

  if (status.status === 'auth-failed') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass p-6 max-w-md w-full text-center flex flex-col items-center gap-3">
          <AlertCircle size={32} className="text-red-400" aria-hidden="true" />
          <div className="text-base font-medium text-text-primary">
            {t('connection.authFailed.title')}
          </div>
          <div className="text-sm text-text-secondary">{t('connection.authFailed.body')}</div>
          <button
            onClick={() => router.push('/onboarding')}
            className="mt-1 px-5 py-2.5 rounded-full bg-accent/20 border border-accent/40 text-accent text-sm hover:bg-accent/30"
          >
            {t('connection.authFailed.action')}
          </button>
        </div>
      </div>
    );
  }

  if (!profilesLoaded) {
    return <DashboardSkeleton hint={t('connection.profilesLoading')} />;
  }

  if (!active) {
    return <ProfilePicker />;
  }

  return <Dashboard />;
}
