'use client';

import { useState } from 'react';
import OnboardingPage from './onboarding/page';
import { useConnection } from '@/lib/ha/ConnectionProvider';
import { nav } from '@/lib/ingress/nav';
import { useProfiles } from '@/lib/profiles/ProfilesProvider';
import { usePages } from '@/lib/pages/PagesProvider';
import { useT } from '@/lib/i18n/I18nProvider';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { ProfilePicker } from '@/components/profile/ProfilePicker';
import { FirstRunWizard } from '@/components/wizard/FirstRunWizard';
import { shouldShowWizard } from '@/lib/wizard/firstRun';
import { AlertCircle } from 'lucide-react';

export default function HomePage() {
  const t = useT();
  const { hasCredentials, initialized, status, isReady, forget } = useConnection();
  const { active, loaded: profilesLoaded } = useProfiles();
  const { pages } = usePages();
  const [wizardDismissed, setWizardDismissed] = useState(false);

  if (!initialized) {
    return <DashboardSkeleton />;
  }

  // Под HA Ingress sandbox iframe навигация через window.location ломается,
  // поэтому показываем onboarding inline. Когда connectTo() обновит state в
  // ConnectionProvider, hasCredentials станет true и компонент перерендерится
  // в Dashboard — без навигации между URL.
  if (!hasCredentials) return <OnboardingPage />;

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
            onClick={() => forget()}
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

  // First-run wizard — показываем если профиль свежий, HA подключён,
  // и пользователь ещё не закрыл его в этой сессии. Сам wizard ставит
  // флаг «done» по завершению любого пути (auto-pilot/templates/skip).
  if (
    !wizardDismissed &&
    isReady &&
    pages.length > 0 &&
    shouldShowWizard(active.id, pages)
  ) {
    return <FirstRunWizard onFinish={() => setWizardDismissed(true)} />;
  }

  return <Dashboard />;
}
