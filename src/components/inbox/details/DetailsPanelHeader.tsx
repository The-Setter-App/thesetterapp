"use client";

import { User } from "@/types/inbox";

const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

interface DetailsPanelHeaderProps {
  user: User;
}

export default function DetailsPanelHeader({ user }: DetailsPanelHeaderProps) {
  const displayName = user.name.replace("@", "");

  return (
    <div className="pt-8 pb-4 px-6 flex flex-col items-center">
      {/* Avatar */}
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-16 h-16 rounded-full object-cover mb-4 shadow-lg shadow-orange-100"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 mb-4 shadow-lg shadow-orange-100 flex items-center justify-center text-white font-bold text-2xl">
          ●
        </div>
      )}

      {/* Name & Handle */}
      <h3 className="font-bold text-xl text-gray-900">{displayName}</h3>
      <p className="text-sm text-gray-500 mb-1">{user.name}</p>
      <p className="text-sm text-gray-300 mb-5">我知道你知道.</p>

      {/* Status Button */}
      <button className="flex items-center justify-center w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 mb-4">
        <StarIcon className="w-5 h-5 text-yellow-500 mr-2" />
        <span className="text-sm font-bold text-gray-800">{user.status} - Update</span>
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Contact Fields */}
      <div className="w-full space-y-0">
        <div className="flex items-center justify-between p-3 bg-white rounded-t-xl border border-gray-200 border-b-0 group cursor-pointer shadow-sm">
          <span className="text-sm text-gray-400 px-1">Phone Number</span>
          <CopyIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
        </div>
        <div className="flex items-center justify-between p-3 bg-white rounded-b-xl border border-gray-200 group cursor-pointer shadow-sm">
          <span className="text-sm text-gray-400 px-1">Email</span>
          <CopyIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
        </div>
      </div>

      {/* Setter & Closer Cards */}
      <div className="flex w-full mt-3 space-x-3">
        <div className="flex-1 p-2 border border-gray-200 rounded-xl flex items-center bg-white shadow-sm">
          <div className="flex flex-col ml-1">
            <div className="text-[10px] text-gray-400 mb-0.5">Setter</div>
            <div className="flex items-center">
              <img src="https://randomuser.me/api/portraits/men/8.jpg" className="w-6 h-6 rounded-full mr-2" alt="Setter" />
              <div className="text-xs font-bold truncate">Caleb Bruiners</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-2 border border-gray-200 rounded-xl flex items-center bg-white shadow-sm">
          <div className="flex flex-col ml-1">
            <div className="text-[10px] text-gray-400 mb-0.5">Closer</div>
            <div className="flex items-center">
              <img src="https://randomuser.me/api/portraits/men/9.jpg" className="w-6 h-6 rounded-full mr-2" alt="Closer" />
              <div className="text-xs font-bold truncate">Andrew James</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}