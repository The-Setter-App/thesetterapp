import { Settings } from 'lucide-react';
import SettingsSidebar from '@/components/settings/SettingsSidebar';
import { requireCurrentUser } from '@/lib/currentUser';
import type { ReactNode } from 'react';

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireCurrentUser();

  return (
    <div className="min-h-screen bg-white text-[#101011]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="md:sticky md:top-0 md:h-screen">
          <SettingsSidebar role={user.role} />
        </div>

        <section className="px-4 py-6 md:px-8 md:py-8 lg:px-10">
          <header className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8771FF] text-white shadow-sm">
                <Settings size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
                <p className="text-sm text-[#606266] md:text-base">
                  {user.role === 'owner'
                    ? 'Manage profile, team, socials, and integrations.'
                    : user.role === 'viewer'
                      ? 'Manage your workspace profile.'
                      : 'Manage your profile and team workspace details.'}
                </p>
              </div>
            </div>
          </header>

          <div className="w-full">{children}</div>
        </section>
      </div>
    </div>
  );
}
