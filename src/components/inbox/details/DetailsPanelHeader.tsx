"use client";

import { useState, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";
import { User, StatusType } from "@/types/inbox";
import { updateUserStatusAction } from "@/app/actions/inbox";

const STATUS_OPTIONS: StatusType[] = [
  "New Lead",
  "Qualified",
  "Booked",
  "In-Contact",
  "Won",
  "No-Show",
  "Unqualified",
  "Retarget",
];

// Map status to icon path
const statusIconPaths: Record<StatusType, string> = {
  'Won': '/icons/status-colors/Won.svg',
  'Unqualified': '/icons/status-colors/Unqualified.svg',
  'Booked': '/icons/status-colors/Booked.svg',
  'New Lead': '/icons/status-colors/NewLead.svg',
  'Qualified': '/icons/status-colors/Qualified.svg',
  'No-Show': '/icons/status-colors/NoShow.svg',
  'In-Contact': '/icons/status-colors/InContact.svg',
  'Retarget': '/icons/status-colors/Retarget.svg',
};

const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
  </svg>
);

const StatusIcon = ({ status, className }: { status: StatusType; className?: string }) => {
  const iconPath = statusIconPaths[status];
  if (!iconPath) return null;
  return (
    <img 
      src={iconPath} 
      alt={status} 
      className={className || "w-5 h-5"}
    />
  );
};

interface DetailsPanelHeaderProps {
  user: User;
}

export default function DetailsPanelHeader({ user }: DetailsPanelHeaderProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>(user.status);

  // Always fetch latest user from DB on mount and when status changes
  async function fetchUserStatus() {
    try {
      const res = await fetch(`/api/user-status?recipientId=${user.recipientId || user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status) setCurrentStatus(data.status);
      }
    } catch (err) {
      // fallback: do nothing
    }
  }

  useEffect(() => {
    fetchUserStatus();
    // Listen for custom event (for local tab updates)
    const handler = (e: any) => {
      if (e.detail?.userId === (user.recipientId || user.id)) {
        fetchUserStatus();
      }
    };
    window.addEventListener('userStatusUpdated', handler);
    return () => window.removeEventListener('userStatusUpdated', handler);
    // eslint-disable-next-line
  }, [user.recipientId, user.id]);

  // Listen for SSE status updates (for cross-tab and real-time updates)
  useSSE('/api/sse', {
    onMessage: (msg) => {
      if (msg.type === 'new_message' && msg.data && 'userId' in msg.data && msg.data.userId === (user.recipientId || user.id)) {
        fetchUserStatus();
      }
    }
  });
  const displayName = user.name.replace("@", "");

  const handleStatusSelect = async (newStatus: StatusType) => {
    setIsUpdating(true);
    setShowStatusDropdown(false);
    try {
      await updateUserStatusAction(user.recipientId || user.id, newStatus);
      // Emit custom event for local tab
      window.dispatchEvent(
        new CustomEvent('userStatusUpdated', {
          detail: { userId: user.recipientId || user.id, status: newStatus },
        })
      );
      // Optionally: send SSE event from backend for cross-tab
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="pt-8 pb-4 px-6 flex flex-col items-center">
      {/* Avatar */}
      <img
        src={user.avatar || "/images/no_profile.jpg"}
        alt={user.name}
        className="w-16 h-16 rounded-full object-cover mb-4 shadow-lg shadow-orange-100"
      />

      {/* Name & Handle */}
      <h3 className="font-bold text-xl text-gray-900">{displayName}</h3>
      <p className="text-sm text-gray-500 mb-1">{user.name}</p>
      <p className="text-sm text-gray-300 mb-5">我知道你知道.</p>

      {/* Status Button */}
      <div className="relative w-full mb-4">
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          disabled={isUpdating}
          className="flex items-center justify-center w-full px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <StatusIcon status={currentStatus} className="w-5 h-5 mr-2" />
          <span className="text-sm font-bold text-gray-800">
            {currentStatus} {isUpdating ? "..." : "- Update"}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 ml-2 transition-transform ${
              showStatusDropdown ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* Status Dropdown Menu */}
        {showStatusDropdown && !isUpdating && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="max-h-64 overflow-y-auto">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center ${
                    currentStatus === status
                      ? "bg-[#8771FF] text-white" // No hover for selected
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={isUpdating}
                >
                  <StatusIcon status={status} className="w-4 h-4 mr-2" />
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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