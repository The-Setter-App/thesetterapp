"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LuCheck, LuChevronDown, LuCopy } from "react-icons/lu";
import { updateUserStatusAction } from "@/app/actions/inbox";
import { StatusIcon } from "@/components/icons/StatusIcon";
import LeadSourceBadge from "@/components/inbox/details/LeadSourceBadge";
import { AppImage } from "@/components/ui/AppImage";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import { loadInboxStatusCatalog } from "@/lib/inbox/clientStatusCatalog";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import {
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import {
  DEFAULT_STATUS_TAGS,
  findStatusTagByName,
  isStatusType,
} from "@/lib/status/config";
import type { ConversationContactDetails, SSEEvent, User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

const COPY_BUTTON_CLASS =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-[#9A9CA2] outline-none transition-colors duration-100 [@media(hover:hover)]:hover:bg-[#F8F7FF] [@media(hover:hover)]:hover:text-[#606266]";

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
  }, [user.status]);

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
      const customEvent = e as CustomEvent<{
        userId?: string;
        status?: string;
      }>;
      if (
        customEvent.detail?.userId === userId &&
        isStatusType(customEvent.detail?.status)
      ) {
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
    <div className="flex flex-col items-center px-5 pb-5 pt-8">
      <AppImage
        src={user.avatar || "/images/no_profile.jpg"}
        alt={user.name}
        className="h-[4.5rem] w-[4.5rem] rounded-full object-cover"
        loadingMode="eager"
      />

      <h3 className="mt-4 max-w-full truncate text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-[#101011]">
        {displayName}
      </h3>
      <p className="mt-0.5 max-w-full truncate text-sm text-[#9A9CA2]">
        {user.name}
      </p>

      <div className="relative mt-5 w-full">
        <button
          type="button"
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          disabled={isUpdating}
          aria-haspopup="listbox"
          aria-expanded={showStatusDropdown}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#F0F2F6] bg-white px-4 shadow-sm outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:enabled:hover:bg-[#F8F7FF]"
        >
          <StatusIcon
            status={currentStatus}
            iconPack={currentStatusMeta?.iconPack}
            iconName={currentStatusMeta?.iconName}
            className="h-[1.125rem] w-[1.125rem] shrink-0"
            style={{ color: statusColor }}
          />
          <span
            className="truncate text-sm font-semibold"
            style={{ color: statusColor }}
          >
            {currentStatus}
          </span>
          <span className="shrink-0 text-sm font-medium text-[#9A9CA2]">
            {statusActionLabel}
          </span>
          <LuChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-[#9A9CA2] transition-transform duration-150 ${
              showStatusDropdown ? "rotate-180" : ""
            }`}
          />
        </button>

        {showStatusDropdown && !isUpdating && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white p-1.5 shadow-[0_12px_32px_rgba(16,16,17,0.1)]">
            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {dropdownStatuses.map((statusRow) => {
                const active = statusRow.name === currentStatus;
                return (
                  <button
                    key={statusRow.id}
                    type="button"
                    onClick={() => handleStatusSelect(statusRow.name)}
                    className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium outline-none transition-colors duration-100 ${
                      active
                        ? "bg-[#F3F0FF] text-[#101011]"
                        : "text-[#606266] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
                    }`}
                  >
                    <StatusIcon
                      status={statusRow.name}
                      iconPack={statusRow.iconPack}
                      iconName={statusRow.iconName}
                      className="h-[1.125rem] w-[1.125rem] shrink-0"
                      style={{ color: statusRow.colorHex }}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {statusRow.name}
                    </span>
                    {active && (
                      <LuCheck
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-[#8771FF]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Phone and email share one grouped field, split by a hairline. */}
      <div className="mt-3 w-full overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white">
        <div
          className={`flex h-12 items-center gap-2 border-b px-3.5 ${
            phoneValid ? "border-[#F0F2F6]" : "border-red-300 bg-red-50"
          }`}
        >
          <input
            type="text"
            placeholder="Phone number"
            aria-label="Phone number"
            aria-invalid={!phoneValid}
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
            className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] text-[#101011] outline-none placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.phoneNumber, "phone")}
            className={COPY_BUTTON_CLASS}
          >
            {copiedField === "phone" ? (
              <LuCheck aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <LuCopy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {copiedField === "phone" ? "Copied" : "Copy"}
          </button>
        </div>
        <div
          className={`flex h-12 items-center gap-2 px-3.5 ${
            emailValid ? "" : "bg-red-50"
          }`}
        >
          <input
            type="email"
            placeholder="Email"
            aria-label="Email"
            aria-invalid={!emailValid}
            value={contactDetails.email}
            onChange={(e) =>
              onChangeContactDetails({
                ...contactDetails,
                email: e.target.value,
              })
            }
            onBlur={() => {
              if (!phoneValid || !emailValid) return;
              onCommitContactDetails(contactDetails);
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-[0.9375rem] text-[#101011] outline-none placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0"
          />
          <button
            type="button"
            onClick={() => handleCopy(contactDetails.email, "email")}
            className={COPY_BUTTON_CLASS}
          >
            {copiedField === "email" ? (
              <LuCheck aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <LuCopy aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {copiedField === "email" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <LeadSourceBadge leadSource={user.leadSource} />

      <div className="mt-3 flex min-h-[3.25rem] w-full items-center gap-3 rounded-2xl bg-[#F8F7FF] px-3.5 py-2.5">
        {user.assignedToLabel && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#8771FF]">
            {user.assignedToLabel.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#9A9CA2]">Assigned to</p>
          {user.assignedToLabel ? (
            <p className="truncate text-[0.8125rem] font-semibold text-[#101011]">
              {user.assignedToLabel}
            </p>
          ) : (
            <p className="text-[0.8125rem] text-[#606266]">
              Unassigned — auto-assigns to whoever replies first
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
