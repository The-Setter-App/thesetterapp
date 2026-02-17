import ProfileSettingsContent from '@/components/settings/ProfileSettingsContent';
import { requireCurrentUser } from '@/lib/currentUser';

export default async function SettingsProfilePage() {
  const { user } = await requireCurrentUser();
  return <ProfileSettingsContent user={user} />;
}
