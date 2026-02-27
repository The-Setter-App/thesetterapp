"use client";

import { useState, useEffect } from "react";
import { User, StatusType } from "@/types/inbox";
import type { ConversationContactDetails } from "@/types/inbox";
import { updateUserStatusAction } from "@/app/actions/inbox";
import { isStatusType, STATUS_COLOR_ICON_PATHS, STATUS_OPTIONS } from "@/lib/status/config";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import type { SSEEvent } from "@/types/inbox";
import {
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";

const CopyIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5" />
  </svg>
);

const StatusIcon = ({ status, className }: { status: StatusType; className?: string }) => {
  const iconPath = STATUS_COLOR_ICON_PATHS[status];
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
  contactDetails: ConversationContactDetails;
  onChangeContactDetails: (next: ConversationContactDetails) => void;
  onCommitContactDetails: (next: ConversationContactDetails) => void;
}

export default function DetailsPanelHeader({
  user,
  contactDetails,
  onChangeContactDetails,
  onCommitContactDetails,
}: DetailsPanelHeaderProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StatusType>(user.status);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);

  const userId = user.id;

  // Keep local status in sync when switching conversations.
  useEffect(() => {
    setCurrentStatus(user.status);
  }, [user.status, userId]);

  useEffect(() => {
    // Listen for local optimistic updates.
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; status?: StatusType }>;
      if (customEvent.detail?.userId === userId && isStatusType(customEvent.detail?.status)) {
        setCurrentStatus(customEvent.detail.status);
      }
    };
    window.addEventListener('userStatusUpdated', handler);
    return () => window.removeEventListener('userStatusUpdated', handler);
  }, [userId]);

  // Listen for SSE status updates (cross-tab / external updates)
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const msg = customEvent.detail;
      if (!msg || typeof msg !== "object") return;
      if (msg.type !== "user_status_updated") return;
      if (msg.data.conversationId !== userId) return;
      if (!isStatusType(msg.data.status)) return;
      setCurrentStatus(msg.data.status);
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [userId]);
  const displayName = user.name.replace("@", "");
  const emailValue = contactDetails.email.trim();
  const phoneValue = contactDetails.phoneNumber.trim();
  const emailValid = !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneDigits = phoneValue.replace(/\D/g, "");
  const phoneValid = !phoneValue || (/^[0-9+\-() ]+$/.test(phoneValue) && phoneDigits.length >= 7 && phoneDigits.length <= 16);

  const handleCopy = async (value: string, field: "phone" | "email") => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1200);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleStatusSelect = async (newStatus: StatusType) => {
    if (newStatus === currentStatus) {
      setShowStatusDropdown(false);
      return;
    }

    const previousStatus = currentStatus;
    setCurrentStatus(newStatus);
    setIsUpdating(true);
    setShowStatusDropdown(false);

    // Optimistic local update so both sidebars reflect immediately.
    emitConversationStatusSynced({ conversationId: userId, status: newStatus });
    syncConversationStatusToClientCache(userId, newStatus).catch((error) =>
      console.error("Failed to sync status cache:", error)
    );

    try {
      await updateUserStatusAction(userId, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
      setCurrentStatus(previousStatus);
      emitConversationStatusSynced({ conversationId: userId, status: previousStatus });
      syncConversationStatusToClientCache(userId, previousStatus).catch((cacheError) =>
        console.error("Failed to sync status cache:", cacheError)
      );
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
      <p className="text-sm text-gray-500 mb-5">{user.name}</p>

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
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
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
        <div className={`flex items-center justify-between p-3 bg-white rounded-t-xl border border-b-0 group shadow-sm ${phoneValid ? "border-gray-200" : "border-rose-300"}`}>
          <input
            type="text"
            placeholder="Phone Number"
            value={contactDetails.phoneNumber}
            onChange={(e) =>
              onChangeContactDetails({
                ...contactDetails,
                phoneNumber: e.target.value.replace(/[^0-9+\-() ]/g, ""),
              })
            }
            onBlur={() => {
              if (!phoneValid || !emailValid) return;
              onCommitContactDetails(contactDetails);
            }}
            className="text-sm text-gray-700 px-1 w-full bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.phoneNumber, "phone")}
            className="ml-2 inline-flex items-center text-[10px] text-gray-500 hover:text-gray-700"
          >
            <CopyIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
            <span className="ml-1">{copiedField === "phone" ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <div className={`flex items-center justify-between p-3 bg-white rounded-b-xl border group shadow-sm ${emailValid ? "border-gray-200" : "border-rose-300"}`}>
          <input
            type="email"
            placeholder="Email"
            value={contactDetails.email}
            onChange={(e) => onChangeContactDetails({ ...contactDetails, email: e.target.value })}
            onBlur={() => {
              if (!phoneValid || !emailValid) return;
              onCommitContactDetails(contactDetails);
            }}
            className="text-sm text-gray-700 px-1 w-full bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.email, "email")}
            className="ml-2 inline-flex items-center text-[10px] text-gray-500 hover:text-gray-700"
          >
            <CopyIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
            <span className="ml-1">{copiedField === "email" ? "Copied" : "Copy"}</span>
          </button>
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
