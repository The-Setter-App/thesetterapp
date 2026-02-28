import type { ReactNode } from "react";
import SettingsPageHeader from "@/components/settings/SettingsPageHeader";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import { requireCurrentUser } from "@/lib/currentUser";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireCurrentUser();

  return (
    <div className="h-full overflow-y-auto bg-white text-[#101011]">
      <SettingsPageHeader role={user.role} />
      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="md:sticky md:top-0 md:h-screen">
          <SettingsSidebar role={user.role} />
        </div>

        <section className="bg-white">
          <div className="w-full px-4 py-6 md:px-8 md:py-8 lg:px-10">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
