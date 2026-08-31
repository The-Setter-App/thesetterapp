"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { IconType } from "react-icons";
import {
  LuBot,
  LuCalendar,
  LuInbox,
  LuLogOut,
  LuSettings,
} from "react-icons/lu";
import { logout } from "@/app/actions/auth";
import { DashboardFrameIcon } from "@/components/icons/DashboardFrameIcon";
import { LeadsIcon } from "@/components/icons/LeadsIcon";
import { AppImage } from "@/components/ui/AppImage";
import { resetCache } from "@/lib/cache";
import { getCurrentCalendarPath } from "@/lib/calendarRoute";
import type { UserRole } from "@/types/auth";

type NavConfig = {
  href: string;
  activePrefix?: string;
  icon: IconType;
  alt: string;
};

const NavItem = ({ href, activePrefix, icon: Icon, alt }: NavConfig) => {
  const pathname = usePathname();
  const activePath = activePrefix ?? href;
  const isActive =
    pathname === activePath || pathname.startsWith(`${activePath}/`);

  return (
    <Link
      href={href}
      prefetch={true}
      className="group relative flex items-center justify-center focus:outline-none"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200 ${
          isActive ? "bg-[#E4E7EC]" : "group-hover:bg-[#E4E7EC]/60"
        }`}
      >
        <Icon
          className={`h-[19px] w-[19px] transition-colors duration-200 ${
            isActive
              ? "text-[#101011]"
              : "text-[#9A9CA2] group-hover:text-[#606266]"
          }`}
          strokeWidth={isActive ? 2.5 : 2.25}
          aria-label={alt}
        />
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#F0F2F6] bg-white px-3 py-1 text-xs font-medium text-[#101011] shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 z-10"
      >
        {alt}
      </span>
    </Link>
  );
};

const NAV_ITEMS_BY_ROLE: Record<UserRole, NavConfig[]> = {
  owner: [
    { href: "/dashboard", icon: DashboardFrameIcon, alt: "Dashboard" },
    { href: "/inbox", icon: LuInbox, alt: "Inbox" },
    { href: "/leads", icon: LeadsIcon, alt: "Leads" },
    {
      href: getCurrentCalendarPath(),
      activePrefix: "/calendar",
      icon: LuCalendar,
      alt: "Calendar",
    },
    { href: "/setter-ai", icon: LuBot, alt: "Setter AI" },
    { href: "/settings/profile", icon: LuSettings, alt: "Settings" },
  ],
  setter: [
    { href: "/dashboard", icon: DashboardFrameIcon, alt: "Dashboard" },
    { href: "/inbox", icon: LuInbox, alt: "Inbox" },
    { href: "/leads", icon: LeadsIcon, alt: "Leads" },
    {
      href: getCurrentCalendarPath(),
      activePrefix: "/calendar",
      icon: LuCalendar,
      alt: "Calendar",
    },
    { href: "/setter-ai", icon: LuBot, alt: "Setter AI" },
    { href: "/settings/profile", icon: LuSettings, alt: "Settings" },
  ],
  closer: [
    { href: "/dashboard", icon: DashboardFrameIcon, alt: "Dashboard" },
    { href: "/inbox", icon: LuInbox, alt: "Inbox" },
    { href: "/leads", icon: LeadsIcon, alt: "Leads" },
    {
      href: getCurrentCalendarPath(),
      activePrefix: "/calendar",
      icon: LuCalendar,
      alt: "Calendar",
    },
    { href: "/setter-ai", icon: LuBot, alt: "Setter AI" },
    { href: "/settings/profile", icon: LuSettings, alt: "Settings" },
  ],
  viewer: [
    { href: "/dashboard", icon: DashboardFrameIcon, alt: "Dashboard" },
    { href: "/settings/profile", icon: LuSettings, alt: "Settings" },
  ],
};

interface SidebarProps {
  role: UserRole;
  displayName: string;
  email: string;
  profileImageBase64?: string;
}

const Sidebar = ({
  role,
  displayName,
  email,
  profileImageBase64,
}: SidebarProps) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navItems = NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE.viewer;

  return (
    <div className="fixed left-0 top-0 z-50 flex h-screen w-[76px] flex-col items-center bg-[#F0F2F6] py-5">
      {/* Logo / profile badge - sits above the nav group, own spacing */}
      <div className="mb-5">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-white relative">
          <AppImage
            src={profileImageBase64 || "/images/no_profile.jpg"}
            alt={`${displayName} avatar`}
            title={`${displayName} (${email})`}
            className="w-full h-full object-cover"
            loadingMode="eager"
          />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col items-center gap-5">
        {navItems.map((item) => (
          <NavItem
            key={`${item.alt}-${item.activePrefix ?? item.href}`}
            {...item}
          />
        ))}
      </div>

      {/* Logout Button */}
      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setShowLogoutDialog(true)}
          className="group relative p-2 text-[#9A9CA2] hover:text-red-500 transition-colors duration-200"
          title="Logout"
        >
          <LuLogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-[#F0F2F6] w-full max-w-[340px] overflow-hidden">
            {/* Dialog Body */}
            <div className="px-6 pt-7 pb-6 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f0ecff] to-[#e8e3ff] flex items-center justify-center mb-4">
                <LuLogOut className="w-5 h-5 text-[#8771FF]" />
              </div>
              <h3 className="text-base font-semibold text-[#101011] mb-1">
                Log out of Setter?
              </h3>
              <p className="text-sm text-[#9A9CA2]">
                You'll need to sign in again to access your account.
              </p>
            </div>
            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#F0F2F6] flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#606266] bg-white border border-[#F0F2F6] hover:bg-[#F8F7FF] hover:border-[#F0F2F6] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetCache();
                  await logout();
                  setShowLogoutDialog(false);
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#8771FF] hover:bg-[#7461e6] active:scale-[0.98] rounded-xl shadow-sm transition-all"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
