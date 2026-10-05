"use client";

import { useEffect, useState } from "react";
import {
  INBOX_CACHE_WARMUP_STATUS_EVENT,
  type InboxCacheWarmupStatus,
  readInboxCacheWarmupStatus,
  requestInboxCacheWarmup,
} from "@/lib/inboxCacheWarmup";

function getChipLabel(status: InboxCacheWarmupStatus): string {
  if (status.state === "running") {
    return `Syncing messages ${status.completedConversations}/${status.totalConversations}`;
  }
  if (status.state === "completed") {
    return "Messages synced";
  }
  if (status.state === "failed") {
    return `Sync issue (${status.failedConversations} failed)`;
  }
  return "Preparing sync";
}

function getChipClasses(status: InboxCacheWarmupStatus): string {
  if (status.state === "completed") {
    return "bg-[#F3F0FF] text-[#6d5ed6]";
  }
  if (status.state === "failed") {
    return "bg-red-50 text-red-700";
  }
  return "bg-[#F4F5F8] text-[#606266]";
}

export default function ConnectSyncWarmupStatus({
  connectSuccess,
}: {
  connectSuccess: boolean;
}) {
  const [status, setStatus] = useState<InboxCacheWarmupStatus>(() =>
    readInboxCacheWarmupStatus(),
  );

  useEffect(() => {
    const handleStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<InboxCacheWarmupStatus>;
      if (customEvent.detail) {
        setStatus(customEvent.detail);
        return;
      }
      setStatus(readInboxCacheWarmupStatus());
    };

    window.addEventListener(
      INBOX_CACHE_WARMUP_STATUS_EVENT,
      handleStatusUpdate,
    );
    return () => {
      window.removeEventListener(
        INBOX_CACHE_WARMUP_STATUS_EVENT,
        handleStatusUpdate,
      );
    };
  }, []);

  useEffect(() => {
    if (!connectSuccess) return;
    requestInboxCacheWarmup();
  }, [connectSuccess]);

  const shouldRender = connectSuccess || status.state !== "idle";
  if (!shouldRender) return null;

  return (
    <div
      aria-live="polite"
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold tabular-nums ${getChipClasses(status)}`}
    >
      {getChipLabel(status)}
    </div>
  );
}
