"use client";

import {
  Instagram,
  type LucideIcon,
  PlugZap,
  Tags,
  UserRound,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types/auth";

interface SettingsNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ownerSettingsNavItems: SettingsNavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
  { href: "/settings/team", label: "Team", icon: Users2 },
  { href: "/settings/socials", label: "Socials", icon: Instagram },
  { href: "/settings/tags", label: "Status Tags", icon: Tags },
  { href: "/settings/integration", label: "Integration", icon: PlugZap },
];

const teamMemberSettingsNavItems: SettingsNavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
  { href: "/settings/team", label: "Team", icon: Users2 },
  { href: "/settings/tags", label: "Status Tags", icon: Tags },
];

const viewerSettingsNavItems: SettingsNavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
];

function getSettingsItems(role: UserRole): SettingsNavItem[] {
  if (role === "owner") return ownerSettingsNavItems;
  if (role === "setter" || role === "closer") return teamMemberSettingsNavItems;
  return viewerSettingsNavItems;
}

export default function SettingsSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const settingsNavItems = getSettingsItems(role);

  return (
    <aside className="h-screen border-r border-[#F0F2F6] bg-white">
      <div className="flex h-full flex-col p-4 md:p-6">
        <nav className="flex gap-2 overflow-x-auto md:block md:space-y-2 md:overflow-visible">
          {settingsNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-12 min-w-fit items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors focus:outline-none md:flex md:w-full ${
                  isActive
                    ? "border-[#8771FF] bg-[#8771FF] text-white"
                    : "border-[#F0F2F6] bg-white text-[#606266] hover:bg-[#F8F7FF]"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-white" : "text-[#606266]"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
