"use client";

import { usePathname } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import {
  findActiveSettingsTab,
  getSettingsTabs,
} from "@/components/settings/settingsNavigation";
import type { UserRole } from "@/types/auth";

export default function SettingsPageHeader({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const activeTab = findActiveSettingsTab(getSettingsTabs(role), pathname);

  return (
    <PageHeader
      divider={false}
      className="shrink-0 pb-4"
      title="Settings"
      description={activeTab.description}
    />
  );
}
