import type { ReactNode } from "react";
import SettingsPageHeader from "@/components/settings/SettingsPageHeader";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireCurrentSettingsUser();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-[#101011]">
      <SettingsPageHeader role={user.role} />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="shrink-0 md:h-full">
          <SettingsSidebar role={user.role} />
        </div>

        <section className="min-h-0 overflow-y-auto bg-white">
          <div className="w-full px-4 py-6 md:px-8 md:py-8 lg:px-10">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
