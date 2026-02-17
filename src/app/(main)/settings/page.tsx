import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/currentUser';
import ProfileSettingsContent from '@/components/settings/ProfileSettingsContent';

interface SettingsRootPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsRootPage({ searchParams }: SettingsRootPageProps) {
  const { user } = await requireCurrentUser();
  const params = await searchParams;
  const hasSocialState = Boolean(params.error || params.success || params.warning || params.disconnectedAccountId || params.missing || params.connectedCount);

  if (hasSocialState && user.role === 'owner') {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') query.set(key, value);
      if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    });
    const suffix = query.toString();
    redirect(`/settings/socials${suffix ? `?${suffix}` : ''}`);
  }

  if (user.role === 'setter' || user.role === 'closer') {
    redirect('/settings/team');
  }

  return <ProfileSettingsContent user={user} />;
}
