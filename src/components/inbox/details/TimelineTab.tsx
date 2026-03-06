import { useEffect, useMemo, useState } from "react";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { loadInboxStatusCatalog } from "@/lib/inbox/clientStatusCatalog";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import { DEFAULT_STATUS_TAGS, findStatusTagByName } from "@/lib/status/config";
import type { ConversationTimelineEvent } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

interface TimelineTabProps {
  events: ConversationTimelineEvent[];
  onClear: () => void;
}

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TimelineTab({ events, onClear }: TimelineTabProps) {
  const [statusCatalog, setStatusCatalog] = useState<TagRow[]>([]);

  useEffect(() => {
    loadInboxStatusCatalog()
      .then((statuses) => setStatusCatalog(statuses))
      .catch((error) =>
        console.error("[TimelineTab] Failed to load status catalog:", error),
      );
  }, []);

  useEffect(() => {
    return subscribeInboxStatusCatalogChanged((statuses) => {
      if (!Array.isArray(statuses)) return;
      setStatusCatalog(statuses);
    });
  }, []);

  const activeStatusCatalog = useMemo(
    () => (statusCatalog.length > 0 ? statusCatalog : DEFAULT_STATUS_TAGS),
    [statusCatalog],
  );

  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (!sorted.length) {
    return (
      <div className="h-full overflow-y-auto bg-[#F8F7FF] p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full bg-[#F4F5F8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#606266]">
                Timeline
              </p>
              <h3 className="mt-2 text-sm font-semibold text-[#101011]">
                Conversation Activity
              </h3>
            </div>
            <span className="rounded-full bg-[#F4F5F8] px-3 py-1 text-xs font-medium text-[#606266]">
              0 events
            </span>
          </div>
        </div>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="h-11 rounded-full bg-[#8771FF] px-4 text-xs font-medium text-white transition-all hover:bg-[#6d5ed6] active:scale-95"
          >
            Clear Timeline
          </button>
        </div>
        <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-[#101011]">
            No timeline events yet
          </p>
          <p className="mt-1 text-xs text-[#606266]">
            Status changes will appear here and are saved per conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F8F7FF] p-4 md:p-6">
      <div className="mb-4 rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full bg-[#F4F5F8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#606266]">
              Timeline
            </p>
            <h3 className="mt-2 text-sm font-semibold text-[#101011]">
              Conversation Activity
            </h3>
          </div>
          <span className="rounded-full bg-[#F4F5F8] px-3 py-1 text-xs font-medium text-[#606266]">
            {sorted.length} events
          </span>
        </div>
      </div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="h-11 rounded-full bg-[#8771FF] px-4 text-xs font-medium text-white transition-all hover:bg-[#6d5ed6] active:scale-95"
        >
          Clear Timeline
        </button>
      </div>
      <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm">
        <div className="flex flex-col">
          {sorted.map((event, idx) => {
            const statusMeta = findStatusTagByName(
              activeStatusCatalog,
              event.status,
            );
            const statusColor = statusMeta?.colorHex ?? "#8771FF";

            return (
              <div key={event.id} className="flex gap-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 flex items-center justify-center z-10">
                    <StatusIcon
                      status={event.status}
                      iconPack={statusMeta?.iconPack}
                      iconName={statusMeta?.iconName}
                      className="w-5 h-5"
                      style={{ color: statusColor }}
                    />
                  </div>
                  {idx !== sorted.length - 1 ? (
                    <div className="flex-1 w-px border-l-2 border-[#F0F2F6] my-2" />
                  ) : null}
                </div>
                <div
                  className={`flex-1 pt-1 ${idx !== sorted.length - 1 ? "pb-8" : ""}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div
                        className="font-semibold text-sm"
                        style={{ color: statusColor }}
                      >
                        {event.title}
                      </div>
                      <div className="text-xs text-[#606266] mt-0.5">
                        {event.sub}
                      </div>
                    </div>
                    <span className="text-xs text-[#606266] text-right min-w-[92px]">
                      {formatEventDate(event.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
