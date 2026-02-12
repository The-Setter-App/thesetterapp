"use client";

import Image from 'next/image';
import { User, StatusType } from '@/types/inbox';

const statusColorIcons = {
  'Won': '/icons/status-colors/Won.svg',
  'Unqualified': '/icons/status-colors/Unqualified.svg',
  'Booked': '/icons/status-colors/Booked.svg',
  'New Lead': '/icons/status-colors/NewLead.svg',
  'Qualified': '/icons/status-colors/Qualified.svg',
  'No-Show': '/icons/status-colors/NoShow.svg',
  'In-Contact': '/icons/status-colors/InContact.svg',
  'Retarget': '/icons/status-colors/Retarget.svg',
};

interface ConversationListProps {
  users: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onAction: (action: 'priority' | 'unread' | 'delete') => void;
}

const VerifiedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const FolderMoveIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12h5.25m0 0L15 9.75m2.25 2.25L15 14.25M3.75 6A2.25 2.25 0 016 3.75h2.625a1.5 1.5 0 011.06.44l1.125 1.125a1.5 1.5 0 001.06.44h4.125A2.25 2.25 0 0118.25 7.875v10.5a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
  </svg>
);

export default function ConversationList({ users, selectedUserId, onSelectUser, onAction }: ConversationListProps) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
      {users.map((u) => (
        <div
          key={u.recipientId || u.id}
          className={`group flex items-center px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 hover:z-50 relative ${
            selectedUserId === u.recipientId ? 'bg-blue-50/50' : ''
          }`}
          onClick={() => onSelectUser(u.recipientId || u.id)}
        >
          <div className="relative flex-shrink-0">
            <img 
              src={u.avatar || "/images/no_profile.jpg"} 
              alt={u.name} 
              className="w-10 h-10 rounded-full object-cover" 
            />
            {(u.unread ?? 0) > 0 && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8771FF] text-[10px] font-bold text-white border-2 border-white">
                {u.unread}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0 ml-3 mr-2">
            <div className="flex items-center mb-0.5">
              <span className="font-bold text-sm text-gray-900 truncate">{u.name}</span>
              {u.verified && (
                <span className="ml-1">
                  <VerifiedIcon />
                </span>
              )}
              <span className="text-[10px] text-gray-400 ml-2 whitespace-nowrap">{u.time}</span>
            </div>
            <div className="text-xs text-gray-500 truncate">{u.lastMessage}</div>
          </div>

          <div className="flex-shrink-0">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold border ${u.statusColor}`}>
              {statusColorIcons[u.status as keyof typeof statusColorIcons] && (
                <img src={statusColorIcons[u.status as keyof typeof statusColorIcons]} alt={u.status} className="w-4 h-4" />
              )}
              <span>{u.status}</span>
            </div>
          </div>

          {/* Floating Action Icons (show on hover) */}
          <div
            className="absolute top-1.5 right-2 flex flex-row gap-1 bg-[#2B2640] rounded-lg px-1.5 py-1 shadow-lg border border-dashed border-blue-400 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-[100]"
            style={{ minWidth: 60 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Priority */}
            <button className="flex flex-col items-center group/act relative" onClick={() => onAction('priority')} tabIndex={-1}>
              <StarIcon className="w-4 h-4 text-gray-700 group-hover/act:text-yellow-400" />
              <span className="text-[8px] text-gray-300 bg-black bg-opacity-80 rounded px-1.5 py-1 opacity-0 group-hover/act:opacity-100 transition-opacity absolute -bottom-7 right-0 whitespace-nowrap z-[200]">
                Mark as qualified
              </span>
            </button>
            {/* Delete */}
            <button className="flex flex-col items-center group/act relative" onClick={() => onAction('delete')} tabIndex={-1}>
              <XIcon className="w-4 h-4 text-gray-700 group-hover/act:text-red-500" />
              <span className="text-[8px] text-gray-300 bg-black bg-opacity-80 rounded px-1.5 py-1 opacity-0 group-hover/act:opacity-100 transition-opacity absolute -bottom-7 right-0 whitespace-nowrap z-[200]">
                Unqualify and remove user from inbox
              </span>
            </button>
            {/* Unread */}
            <button className="flex flex-col items-center group/act relative" onClick={() => onAction('unread')} tabIndex={-1}>
              <FolderMoveIcon className="w-4 h-4 text-gray-700 group-hover/act:text-yellow-400" />
              <span className="text-[8px] text-gray-300 bg-black bg-opacity-80 rounded px-1.5 py-1 opacity-0 group-hover/act:opacity-100 transition-opacity absolute -bottom-7 right-0 whitespace-nowrap z-[200]">
                Move to priority inbox
              </span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}