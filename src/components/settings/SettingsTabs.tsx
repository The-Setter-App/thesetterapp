"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import {
  findActiveSettingsTab,
  getSettingsTabs,
} from "@/components/settings/settingsNavigation";
import type { UserRole } from "@/types/auth";

interface SettingsTabsProps {
  role: UserRole;
}

// The settings sections as a row of tabs under the page title. With only one
// tab (viewer accounts) there is nothing to switch between, so it is left out.
export default function SettingsTabs({ role }: SettingsTabsProps) {
  const pathname = usePathname();
  const tabs = getSettingsTabs(role);
  const activeTab = findActiveSettingsTab(tabs, pathname);

  if (tabs.length < 2) return null;

  return (
    <nav
      aria-label="Settings sections"
      className={`${PAGE_GUTTER_CLASS} shrink-0 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
    >
      <ul className="inline-flex gap-0.5 rounded-full bg-[#F4F5F8] p-1">
        {tabs.map((tab) => {
          const isActive = tab.href === activeTab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold outline-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
                  isActive
                    ? "bg-white text-[#101011] shadow-[0_1px_3px_rgba(16,16,17,0.12)]"
                    : "text-[#606266] [@media(hover:hover)]:hover:text-[#101011]"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
