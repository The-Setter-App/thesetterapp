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

  const eventCountLabel = `${sorted.length} ${sorted.length === 1 ? "event" : "events"}`;

  return (
    <div className="h-full overflow-y-auto bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#101011]">
            Conversation activity
          </h3>
          <p className="mt-0.5 text-xs text-[#9A9CA2] tabular-nums">
            {eventCountLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={sorted.length === 0}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-[#F3F0FF] px-4 text-xs font-semibold text-[#8771FF] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 [@media(hover:hover)]:enabled:hover:bg-[#EBE5FF]"
        >
          Clear timeline
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl bg-[#F8F7FF] p-5">
          <p className="text-sm font-semibold text-[#101011]">
            No timeline events yet
          </p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
            Status changes will appear here and are saved per conversation.
          </p>
        </div>
      ) : (
        <ol className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
          {sorted.map((event, idx) => {
            const statusMeta = findStatusTagByName(
              activeStatusCatalog,
              event.status,
            );
            const statusColor = statusMeta?.colorHex ?? "#8771FF";
            const isLast = idx === sorted.length - 1;

            return (
              <li key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${statusColor}20` }}
                  >
                    <StatusIcon
                      status={event.status}
                      iconPack={statusMeta?.iconPack}
                      iconName={statusMeta?.iconName}
                      className="h-4 w-4"
                      style={{ color: statusColor }}
                    />
                  </span>
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className="my-1.5 w-px flex-1 bg-[#F0F2F6]"
                    />
                  )}
                </div>
                <div
                  className={`flex min-w-0 flex-1 items-start justify-between gap-3 pt-1 ${isLast ? "" : "pb-6"}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#101011]">
                      {event.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#606266]">{event.sub}</p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] text-[#9A9CA2] tabular-nums">
                    {formatEventDate(event.timestamp)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
