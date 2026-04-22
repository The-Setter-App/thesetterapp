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
    return "border-[#D8D2FF] bg-[#F3F0FF] text-[#6d5ed6]";
  }
  if (status.state === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-[#F0F2F6] bg-[#F8F7FF] text-[#606266]";
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
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getChipClasses(status)}`}
    >
      {getChipLabel(status)}
    </div>
  );
}
