"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// 1. Import the new icons from lucide-react
import { LayoutDashboard, Inbox, Calendar as CalendarIconLucide, type LucideIcon } from 'lucide-react';
import Image from 'next/image';

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

    </div>
  );
};

export default Sidebar;