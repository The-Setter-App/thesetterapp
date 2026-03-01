"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { DEFAULT_STATUS_TAGS, findStatusTagByName } from "@/lib/status/config";
import { loadInboxStatusCatalog } from "@/lib/inbox/clientStatusCatalog";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import type { TagRow } from "@/types/tags";

interface StatusUpdateEventProps {
  status: string;
  timestamp: Date | string;
}

function parseTimestamp(value: Date | string): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function formatStatusUpdateTime(value: Date | string): string {
  const timestamp = parseTimestamp(value);
  const weekday = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(timestamp);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
  return `${weekday} ${time}`;
}

export default function StatusUpdateEvent({
  status,
  timestamp,
}: StatusUpdateEventProps) {
  const [statusCatalog, setStatusCatalog] = useState<TagRow[]>([]);

  useEffect(() => {
    loadInboxStatusCatalog()
      .then((statuses) => setStatusCatalog(statuses))
      .catch((error) =>
        console.error("[StatusUpdateEvent] Failed to load statuses:", error),
      );
  }, []);

  useEffect(() => {
    return subscribeInboxStatusCatalogChanged((statuses) => {
      if (!Array.isArray(statuses)) return;
      setStatusCatalog(statuses);
    });
  }, []);

  const statusMeta = useMemo(
    () =>
      findStatusTagByName(statusCatalog, status) ??
      findStatusTagByName(DEFAULT_STATUS_TAGS, status),
    [status, statusCatalog],
  );
  const statusColor = statusMeta?.colorHex ?? "#8771FF";
  const iconChipBackground = `${statusColor}20`;

  return (
    <div className="my-4 flex justify-center px-2">
      <div className="flex max-w-[320px] flex-col items-center text-center">
        <div
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border shadow-sm"
          style={{
            backgroundColor: iconChipBackground,
            borderColor: `${statusColor}4D`,
          }}
        >
          <StatusIcon
            status={status}
            iconPack={statusMeta?.iconPack}
            iconName={statusMeta?.iconName}
            className="h-4 w-4"
            style={{ color: statusColor }}
          />
        </div>
        <p className="mt-2 text-[16px] font-semibold leading-tight text-[#101011]">
          Status Update: <span className="text-[#101011]">{status}</span>
        </p>
        <p className="mt-1 text-xs font-medium text-[#9A9CA2]">
          {formatStatusUpdateTime(timestamp)}
        </p>
      </div>
    </div>
  );
}
