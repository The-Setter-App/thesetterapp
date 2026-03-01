"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { IconType } from "react-icons";
import {
  LuBot,
  LuCalendar,
  LuInbox,
  LuLayoutDashboard,
  LuLogOut,
  LuSettings,
  LuUsers,
} from "react-icons/lu";
import { logout } from '@/app/actions/auth';
import { resetCache } from '@/lib/cache';
import type { UserRole } from '@/types/auth';

type NavConfig = { to: string; icon: IconType; alt: string };

const NavItem = ({ to, icon: Icon, alt }: { to: string, icon: IconType, alt: string }) => {
  const pathname = usePathname();
  const isActive = pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="relative w-full flex justify-center mb-8">
      {/* Active Indicator: Vertical Bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[#8771FF] rounded-r-md" />
      )}

      <Link 
        href={to} 
        className={`group flex items-center justify-center relative transition-colors duration-200 focus:outline-none ${
          isActive 
            ? 'text-[#8771FF]' 
            : 'text-[#9A9CA2] hover:text-[#606266]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Icon className="w-5 h-5 transition-colors duration-200" aria-label={alt} />
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 whitespace-nowrap rounded-full border border-[#F0F2F6] bg-white px-3 py-1 text-xs font-medium text-[#101011] shadow-sm opacity-0 transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {alt}
        </span>
      </Link>
    </div>
  );
};

const NAV_ITEMS_BY_ROLE: Record<UserRole, NavConfig[]> = {
  owner: [
    { to: '/dashboard', icon: LuLayoutDashboard, alt: 'Dashboard' },
    { to: '/inbox', icon: LuInbox, alt: 'Inbox' },
    { to: '/leads', icon: LuUsers, alt: 'Leads' },
    { to: '/calendar', icon: LuCalendar, alt: 'Calendar' },
    { to: '/setter-ai', icon: LuBot, alt: 'Setter AI' },
    { to: '/settings/profile', icon: LuSettings, alt: 'Settings' },
  ],
  setter: [
    { to: '/dashboard', icon: LuLayoutDashboard, alt: 'Dashboard' },
    { to: '/inbox', icon: LuInbox, alt: 'Inbox' },
    { to: '/leads', icon: LuUsers, alt: 'Leads' },
    { to: '/calendar', icon: LuCalendar, alt: 'Calendar' },
    { to: '/setter-ai', icon: LuBot, alt: 'Setter AI' },
    { to: '/settings/profile', icon: LuSettings, alt: 'Settings' },
  ],
  closer: [
    { to: '/dashboard', icon: LuLayoutDashboard, alt: 'Dashboard' },
    { to: '/inbox', icon: LuInbox, alt: 'Inbox' },
    { to: '/leads', icon: LuUsers, alt: 'Leads' },
    { to: '/calendar', icon: LuCalendar, alt: 'Calendar' },
    { to: '/setter-ai', icon: LuBot, alt: 'Setter AI' },
    { to: '/settings/profile', icon: LuSettings, alt: 'Settings' },
  ],
  viewer: [
    { to: '/dashboard', icon: LuLayoutDashboard, alt: 'Dashboard' },
    { to: '/settings/profile', icon: LuSettings, alt: 'Settings' },
  ],
};

interface SidebarProps {
  role: UserRole;
  displayName: string;
  email: string;
  profileImageBase64?: string;
}

const Sidebar = ({ role, displayName, email, profileImageBase64 }: SidebarProps) => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navItems = NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE.viewer;

  return (
    <div className="w-16 bg-white h-screen flex flex-col items-center py-6 border-r border-[#F0F2F6] fixed left-0 top-0 z-50">
      {/* Profile Icon */}
      <div className="mb-8">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#F0F2F6] relative">
           <img 
             src={profileImageBase64 || "/images/no_profile.jpg"}
             alt={`${displayName} avatar`}
             title={`${displayName} (${email})`}
             className="w-full h-full object-cover"
           />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col w-full">
        {navItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} alt={item.alt} />
        ))}
      </div>

      {/* Logout Button */}
      <div className="mt-auto w-full flex justify-center mb-6">
        <button 
          onClick={() => setShowLogoutDialog(true)}
          className="p-2 text-[#9A9CA2] hover:text-red-500 transition-colors duration-200 group relative"
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
              <h3 className="text-base font-semibold text-[#101011] mb-1">Log out of Setter?</h3>
              <p className="text-sm text-[#9A9CA2]">
                You'll need to sign in again to access your account.
              </p>
            </div>
            {/* Dialog Footer */}
            <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#F0F2F6] flex gap-3">
              <button 
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#606266] bg-white border border-[#F0F2F6] hover:bg-[#F8F7FF] hover:border-[#F0F2F6] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
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

