import ProfileSettingsContent from '@/components/settings/ProfileSettingsContent';
import { requireCurrentSettingsUser } from '@/lib/currentSettingsUser';

export default async function SettingsProfilePage() {
  const { user } = await requireCurrentSettingsUser();
  return <ProfileSettingsContent user={user} />;
}
