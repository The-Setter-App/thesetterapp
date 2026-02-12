"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
// 1. Import the new icons from lucide-react
import { LayoutDashboard, Inbox, Calendar as CalendarIconLucide, LogOut, type LucideIcon } from 'lucide-react';
import Image from 'next/image';
import { logout } from '@/app/actions/auth';

// 2. CSS Filter for the remaining image-based icons (Leads, SetterAI, Settings)
const PURPLE_FILTER = "brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(228deg) brightness(89%) contrast(93%)";

// Helper type to allow both Image strings and Lucide Components
type IconType = string | LucideIcon;

const NavItem = ({ to, icon: Icon, alt }: { to: string, icon: IconType, alt: string }) => {
  const pathname = usePathname();
  const isActive = pathname === to;

  // Helper to check if the icon is a Lucide Component (function) or a file path (string)
  const isLucideIcon = typeof Icon !== 'string';

  return (
    <div className="relative w-full flex justify-center mb-8">
      {/* Active Indicator: Vertical Bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-[#8771FF] rounded-r-md" />
      )}

      <Link 
        href={to} 
        className={`group flex items-center justify-center relative transition-colors duration-200 ${
          isActive 
            ? 'text-[#8771FF]' 
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div className="relative flex items-center justify-center">
          
          {/* RENDER LOGIC: Check if it's a new Lucide icon or an old Image icon */}
          {isLucideIcon ? (
        
            <Icon className="w-5 h-5 transition-colors duration-200" />
          ) : (
            // Using standard img tag for filter support, as next/image doesn't support style filter prop easily without a wrapper
            // and we want to maintain exact fidelity.
            <img 
              src={Icon as string} 
              alt={alt} 
              className="w-5 h-5 object-contain transition-all duration-200"
              style={{ 
                filter: isActive ? PURPLE_FILTER : 'none',
                opacity: isActive ? 1 : 0.6 
              }}
            />
          )}
          
        </div>
      </Link>
    </div>
  );
};

const Sidebar = () => {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  return (
    <div className="w-16 bg-white h-screen flex flex-col items-center py-6 border-r border-gray-100 fixed left-0 top-0 z-50">
      {/* Profile Icon */}
      <div className="mb-8">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-gray-100 relative">
           <img 
             src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
             alt="User" 
             className="w-full h-full object-cover"
           />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col w-full">
        {/* Swapped these 3 to use the Lucide components */}
        <NavItem to="/dashboard" icon={LayoutDashboard} alt="Dashboard" />
        <NavItem to="/inbox" icon={Inbox} alt="Inbox" />
        
        {/* Kept these as images (LeadsIcon is a string path) */}
        <NavItem to="/leads" icon="/icons/Leads.svg" alt="Leads" />
        
        {/* Swapped to Lucide */}
        <NavItem to="/calendar" icon={CalendarIconLucide} alt="Calendar" />
        
        {/* Kept as images */}
        <NavItem to="/setter-ai" icon="/icons/SetterAI.svg" alt="Setter AI" />
        <NavItem to="/settings" icon="/icons/Settings.svg" alt="Settings" />
      </div>

      {/* Logout Button */}
      <div className="mt-auto w-full flex justify-center mb-6">
        <button 
          onClick={() => setShowLogoutDialog(true)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 group relative"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-sm p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to log out of your account?
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await logout();
                  setShowLogoutDialog(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Sidebar;