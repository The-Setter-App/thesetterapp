const MESSAGE_SKELETONS = [
  { id: "message-1", mine: false, width: "w-44" },
  { id: "message-2", mine: false, width: "w-64" },
  { id: "message-3", mine: true, width: "w-56" },
  { id: "message-4", mine: false, width: "w-36" },
  { id: "message-5", mine: true, width: "w-72" },
  { id: "message-6", mine: true, width: "w-40" },
];
const DETAIL_ROW_IDS = ["detail-1", "detail-2", "detail-3", "detail-4"];

const PULSE = "animate-pulse rounded-full bg-[#F4F5F8]";

// Mirrors the chat and details columns so the layout does not jump when the
// conversation loads.
export default function InboxContentSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex h-full min-w-0 flex-1 overflow-hidden bg-white"
    >
      <span className="sr-only">Loading conversation</span>

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-[#F0F2F6] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#F3F0FF]" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 animate-pulse rounded-full bg-[#ECE9FF]" />
              <div className={`h-3 w-24 ${PULSE}`} />
            </div>
          </div>
          <div className={`h-9 w-9 ${PULSE}`} />
        </div>

        <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-5 py-6 md:px-8">
          {MESSAGE_SKELETONS.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`h-10 max-w-[78%] animate-pulse rounded-[1.25rem] ${message.width} ${
                  message.mine
                    ? "rounded-br-md bg-[#ECE9FF]"
                    : "rounded-bl-md bg-[#F4F5F8]"
                }`}
              />
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 pt-2 md:px-6">
          <div className="h-[3.25rem] animate-pulse rounded-[1.625rem] bg-[#F4F5F8]" />
        </div>
      </main>

      <div className="hidden w-px bg-[#F0F2F6] md:block" />

      <aside className="hidden w-[400px] shrink-0 flex-col bg-white md:flex">
        <div className="flex flex-col items-center px-5 pb-5 pt-8">
          <div className="h-[4.5rem] w-[4.5rem] animate-pulse rounded-full bg-[#F3F0FF]" />
          <div className="mt-4 h-5 w-36 animate-pulse rounded-full bg-[#ECE9FF]" />
          <div className={`mt-2 h-3.5 w-24 ${PULSE}`} />
          <div className={`mt-5 h-11 w-full ${PULSE}`} />
          <div className="mt-3 h-24 w-full animate-pulse rounded-2xl bg-[#F4F5F8]" />
        </div>
        <div className="border-b border-[#F0F2F6] px-4 pb-3">
          <div className={`h-10 w-full ${PULSE}`} />
        </div>
        <div className="flex-1 space-y-3 overflow-hidden p-5">
          {DETAIL_ROW_IDS.map((rowId) => (
            <div key={rowId} className="rounded-2xl bg-[#F8F7FF] p-4">
              <div className="h-3.5 w-28 animate-pulse rounded-full bg-[#ECE9FF]" />
              <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-[#F0F2F6]" />
              <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-[#F0F2F6]" />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
