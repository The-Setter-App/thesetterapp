import type { ReactNode } from "react";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import SettingsPageHeader from "@/components/settings/SettingsPageHeader";
import SettingsTabs from "@/components/settings/SettingsTabs";
import surface from "@/components/ui/brandSurface.module.css";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";

export default async function SettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireCurrentSettingsUser();

  return (
    <div
      className={`${surface.surface} flex h-full min-h-0 flex-col overflow-hidden text-[#101011]`}
    >
      <SettingsPageHeader role={user.role} />
      <SettingsTabs role={user.role} />

      <section className="min-h-0 flex-1 overflow-y-auto border-t border-[#F0F2F6]">
        {/* Left-aligned to the page gutter like every other page; the cap
            keeps forms at a comfortable reading width. */}
        <div className={`${PAGE_GUTTER_CLASS} w-full max-w-5xl pb-16 pt-6`}>
          {children}
        </div>
      </section>
    </div>
  );
}
