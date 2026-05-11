/**
 * Standalone-маршрут /settings — для прямого URL-доступа вне HA Ingress.
 * Под Ingress settings рендерится inline через app/page.tsx (см. там),
 * чтобы sandbox iframe не ломал navigation через window.location.
 */
import SettingsView from '@/components/settings/SettingsView';

export default function SettingsPage() {
  return <SettingsView />;
}
