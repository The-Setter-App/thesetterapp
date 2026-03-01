"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { updateUserStatusAction } from "@/app/actions/inbox";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { loadInboxStatusCatalog } from "@/lib/inbox/clientStatusCatalog";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import {
  DEFAULT_STATUS_TAGS,
  findStatusTagByName,
  isStatusType,
} from "@/lib/status/config";
import {
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import type { ConversationContactDetails, SSEEvent, User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5"
    />
  </svg>
);

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
  const [statusUpdatedFlash, setStatusUpdatedFlash] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(user.status);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(
    null,
  );
  const [statusCatalog, setStatusCatalog] = useState<TagRow[]>([]);
  const statusUpdatedTimeoutRef = useRef<number | null>(null);

  const userId = user.id;

  useEffect(() => {
    setCurrentStatus(user.status);
  }, [user.status, userId]);

  useEffect(() => {
    return () => {
      if (statusUpdatedTimeoutRef.current !== null) {
        window.clearTimeout(statusUpdatedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadInboxStatusCatalog()
      .then((statuses) => setStatusCatalog(statuses))
      .catch((error) =>
        console.error("[DetailsPanelHeader] Failed to load statuses:", error),
      );
  }, []);

  useEffect(() => {
    return subscribeInboxStatusCatalogChanged((statuses) => {
      if (!Array.isArray(statuses)) return;
      setStatusCatalog(statuses);
    });
  }, []);

  const currentStatusMeta = useMemo(
    () =>
      findStatusTagByName(statusCatalog, currentStatus) ??
      findStatusTagByName(DEFAULT_STATUS_TAGS, currentStatus),
    [currentStatus, statusCatalog],
  );

  const dropdownStatuses = useMemo(
    () => (statusCatalog.length > 0 ? statusCatalog : DEFAULT_STATUS_TAGS),
    [statusCatalog],
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; status?: string }>;
      if (customEvent.detail?.userId === userId && isStatusType(customEvent.detail?.status)) {
        setCurrentStatus(customEvent.detail.status);
      }
    };
    window.addEventListener("userStatusUpdated", handler);
    return () => window.removeEventListener("userStatusUpdated", handler);
  }, [userId]);

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
  const statusColor = currentStatusMeta?.colorHex || "#8771FF";
  const emailValue = contactDetails.email.trim();
  const phoneValue = contactDetails.phoneNumber.trim();
  const emailValid =
    !emailValue || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneDigits = phoneValue.replace(/\D/g, "");
  const phoneValid =
    !phoneValue ||
    (/^[0-9+\-() ]+$/.test(phoneValue) &&
      phoneDigits.length >= 7 &&
      phoneDigits.length <= 16);
  const statusActionLabel = isUpdating
    ? "Updating"
    : statusUpdatedFlash
      ? "Updated"
      : "Update";

  const handleCopy = async (value: string, field: "phone" | "email") => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(
        () => setCopiedField((prev) => (prev === field ? null : prev)),
        1200,
      );
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setShowStatusDropdown(false);
      return;
    }

    const previousStatus = currentStatus;
    const optimisticUpdatedAt = new Date().toISOString();
    setCurrentStatus(newStatus);
    setIsUpdating(true);
    setStatusUpdatedFlash(false);
    setShowStatusDropdown(false);

    emitConversationStatusSynced({
      conversationId: userId,
      status: newStatus,
      updatedAt: optimisticUpdatedAt,
    });
    syncConversationStatusToClientCache(userId, newStatus).catch((error) =>
      console.error("Failed to sync status cache:", error),
    );

    try {
      await updateUserStatusAction(userId, newStatus);
      setStatusUpdatedFlash(true);
      if (statusUpdatedTimeoutRef.current !== null) {
        window.clearTimeout(statusUpdatedTimeoutRef.current);
      }
      statusUpdatedTimeoutRef.current = window.setTimeout(() => {
        setStatusUpdatedFlash(false);
        statusUpdatedTimeoutRef.current = null;
      }, 3000);
    } catch (error) {
      console.error("Failed to update status:", error);
      setCurrentStatus(previousStatus);
      setStatusUpdatedFlash(false);
      emitConversationStatusSynced({
        conversationId: userId,
        status: previousStatus,
        updatedAt: new Date().toISOString(),
      });
      syncConversationStatusToClientCache(userId, previousStatus).catch(
        (cacheError) =>
          console.error("Failed to sync status cache:", cacheError),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-6 pb-4 pt-8">
      <img
        src={user.avatar || "/images/no_profile.jpg"}
        alt={user.name}
        className="mb-4 h-16 w-16 rounded-full object-cover"
      />

      <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
      <p className="mb-5 text-sm text-gray-500">{user.name}</p>

      <div className="relative mb-4 w-full">
        <button
          type="button"
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          disabled={isUpdating}
          className="flex w-full items-center justify-center rounded-xl border border-[#F0F2F6] bg-white px-4 py-2.5 shadow-sm hover:bg-[#F8F7FF] disabled:opacity-50"
        >
          <StatusIcon
            status={currentStatus}
            iconPack={currentStatusMeta?.iconPack}
            iconName={currentStatusMeta?.iconName}
            className="h-5 w-5 shrink-0"
            style={{ color: statusColor }}
          />
          <span className="ml-2 text-sm font-semibold" style={{ color: statusColor }}>
            {currentStatus}
          </span>
          <span className="ml-1 text-sm font-semibold text-[#101011]">
            - {statusActionLabel}
          </span>
          <svg
            className={`ml-2 h-5 w-5 text-[#9A9CA2] transition-transform ${
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

        {showStatusDropdown && !isUpdating && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="max-h-72 overflow-y-auto">
              {dropdownStatuses.map((statusRow) => {
                const active = statusRow.name === currentStatus;
                return (
                  <button
                    key={statusRow.id}
                    type="button"
                    onClick={() => handleStatusSelect(statusRow.name)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-base font-semibold transition-colors ${
                      active
                        ? "bg-[#8771FF] text-white"
                        : "text-[#606266] hover:bg-gray-50"
                    }`}
                  >
                    <StatusIcon
                      status={statusRow.name}
                      iconPack={statusRow.iconPack}
                      iconName={statusRow.iconName}
                      className="h-5 w-5 shrink-0"
                      style={{ color: active ? "#FFFFFF" : statusRow.colorHex }}
                    />
                    <span style={{ color: active ? "#FFFFFF" : undefined }}>
                      {statusRow.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-full space-y-0">
        <div
          className={`group flex items-center justify-between rounded-t-xl border border-b-0 bg-white p-3 shadow-sm ${
            phoneValid ? "border-gray-200" : "border-rose-300"
          }`}
        >
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
            className="w-full bg-transparent px-1 text-sm text-gray-700 outline-none"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.phoneNumber, "phone")}
            className="ml-2 inline-flex items-center text-[10px] text-gray-500 hover:text-gray-700"
          >
            <CopyIcon className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
            <span className="ml-1">
              {copiedField === "phone" ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
        <div
          className={`group flex items-center justify-between rounded-b-xl border bg-white p-3 shadow-sm ${
            emailValid ? "border-gray-200" : "border-rose-300"
          }`}
        >
          <input
            type="email"
            placeholder="Email"
            value={contactDetails.email}
            onChange={(e) =>
              onChangeContactDetails({ ...contactDetails, email: e.target.value })
            }
            onBlur={() => {
              if (!phoneValid || !emailValid) return;
              onCommitContactDetails(contactDetails);
            }}
            className="w-full bg-transparent px-1 text-sm text-gray-700 outline-none"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.email, "email")}
            className="ml-2 inline-flex items-center text-[10px] text-gray-500 hover:text-gray-700"
          >
            <CopyIcon className="h-4 w-4 text-gray-300 group-hover:text-gray-500" />
            <span className="ml-1">
              {copiedField === "email" ? "Copied" : "Copy"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-3 flex w-full space-x-3">
        <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <div className="ml-1 flex flex-col">
            <div className="mb-0.5 text-[10px] text-gray-400">Setter</div>
            <div className="flex items-center">
              <img
                src="https://randomuser.me/api/portraits/men/8.jpg"
                className="mr-2 h-6 w-6 rounded-full"
                alt="Setter"
              />
              <div className="truncate text-xs font-bold">Caleb Bruiners</div>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
          <div className="ml-1 flex flex-col">
            <div className="mb-0.5 text-[10px] text-gray-400">Closer</div>
            <div className="flex items-center">
              <img
                src="https://randomuser.me/api/portraits/men/9.jpg"
                className="mr-2 h-6 w-6 rounded-full"
                alt="Closer"
              />
              <div className="truncate text-xs font-bold">Andrew James</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
