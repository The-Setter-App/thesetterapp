"use client";

import { LuEyeOff } from "react-icons/lu";
import { User } from '@/types/inbox';

interface ChatHeaderProps {
  user: User | null;
  showVisible: boolean;
  onToggleVisible: () => void;
}

const EyeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function ChatHeader({ user, showVisible, onToggleVisible }: ChatHeaderProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
      <div className="flex items-center">
        <img 
          src={user?.avatar || "/images/no_profile.jpg"} 
          alt={user?.name || "User"} 
          className="w-10 h-10 rounded-full object-cover mr-3" 
        />
        <div>
          <div className="font-bold text-sm text-gray-900">{user?.name?.replace('@', '') || 'Loading...'}</div>
          <div className="text-xs text-gray-400">{user?.name || ''}</div>
        </div>
      </div>
      <div className="flex items-center">
        <button onClick={onToggleVisible} className="mr-4 focus:outline-none">
          {showVisible ? (
            <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
              <EyeIcon className="w-4 h-4 text-gray-500" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-7 h-7 rounded-md border border-gray-200">
              <LuEyeOff className="h-4 w-4 text-gray-500" aria-label="Hidden" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
