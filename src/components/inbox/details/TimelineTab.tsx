import type { ConversationTimelineEvent, StatusType } from "@/types/inbox";

interface TimelineTabProps {
  events: ConversationTimelineEvent[];
  onClear: () => void;
}

const statusIconPaths: Record<StatusType, string> = {
  Won: "/icons/status-colors/Won.svg",
  Unqualified: "/icons/status-colors/Unqualified.svg",
  Booked: "/icons/status-colors/Booked.svg",
  "New Lead": "/icons/status-colors/NewLead.svg",
  Qualified: "/icons/status-colors/Qualified.svg",
  "No-Show": "/icons/status-colors/NoShow.svg",
  "In-Contact": "/icons/status-colors/InContact.svg",
  Retarget: "/icons/status-colors/Retarget.svg",
};

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
  const sorted = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (!sorted.length) {
    return (
      <div className="h-full overflow-y-auto bg-stone-50 p-4 md:p-6">
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-700">Timeline</p>
              <h3 className="mt-2 text-sm font-semibold text-stone-900">Conversation Activity</h3>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">0 events</span>
          </div>
        </div>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="h-11 rounded-full bg-stone-900 px-4 text-xs font-medium text-white transition-all hover:bg-stone-800 active:scale-95"
          >
            Clear Timeline
          </button>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-stone-900">No timeline events yet</p>
          <p className="mt-1 text-xs text-stone-500">Status changes will appear here and are saved per conversation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-stone-50 p-4 md:p-6">
      <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-stone-700">Timeline</p>
            <h3 className="mt-2 text-sm font-semibold text-stone-900">Conversation Activity</h3>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">{sorted.length} events</span>
        </div>
      </div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClear}
          className="h-11 rounded-full bg-stone-900 px-4 text-xs font-medium text-white transition-all hover:bg-stone-800 active:scale-95"
        >
          Clear Timeline
        </button>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col">
        {sorted.map((event, idx) => (
          <div key={event.id} className="flex gap-x-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 flex items-center justify-center z-10">
                <img src={statusIconPaths[event.status] || statusIconPaths["New Lead"]} alt={event.status} className="w-5 h-5" />
              </div>
              {idx !== sorted.length - 1 ? <div className="flex-1 w-px border-l-2 border-stone-200 my-2" /> : null}
            </div>
            <div className={`flex-1 pt-1 ${idx !== sorted.length - 1 ? "pb-8" : ""}`}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold text-stone-900 text-sm">{event.title}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{event.sub}</div>
                </div>
                <span className="text-xs text-stone-500 text-right min-w-[92px]">{formatEventDate(event.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
