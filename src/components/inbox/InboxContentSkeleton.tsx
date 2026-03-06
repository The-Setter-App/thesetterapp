export default function InboxContentSkeleton() {
  const messageSkeletonIds = [
    "message-skeleton-1",
    "message-skeleton-2",
    "message-skeleton-3",
    "message-skeleton-4",
    "message-skeleton-5",
    "message-skeleton-6",
  ] as const;
  const detailTabSkeletonIds = [
    "detail-tab-1",
    "detail-tab-2",
    "detail-tab-3",
    "detail-tab-4",
    "detail-tab-5",
  ] as const;
  const detailCardSkeletonIds = [
    "detail-card-1",
    "detail-card-2",
    "detail-card-3",
    "detail-card-4",
    "detail-card-5",
  ] as const;

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-white">
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        <div className="border-b border-[#F0F2F6] px-5 py-4 md:px-6 md:py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-[#ECE9FF]" />
              <div className="h-4 w-64 animate-pulse rounded bg-[#F4F5F8]" />
            </div>
            <div className="h-10 w-28 animate-pulse rounded-xl bg-[#F4F5F8]" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col bg-white">
            <div className="flex-1 space-y-4 overflow-hidden bg-[#F8F7FF] px-4 py-5 md:px-6">
              {messageSkeletonIds.map((messageId, index) => (
                <div
                  key={messageId}
                  className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`w-full rounded-3xl p-4 shadow-sm ${index % 2 === 0 ? "max-w-[420px] bg-[rgba(135,113,255,0.08)]" : "max-w-[520px] bg-white"}`}
                  >
                    <div className="h-4 w-36 animate-pulse rounded bg-[#ECE9FF]" />
                    <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#F4F5F8]" />
                    <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[#F4F5F8]" />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#F0F2F6] bg-white px-4 py-4 md:px-6">
              <div className="h-12 animate-pulse rounded-2xl bg-[#F4F5F8]" />
            </div>
          </div>

          <div className="hidden w-px bg-[#F0F2F6] md:block" />

          <aside className="hidden w-[400px] shrink-0 bg-white md:flex md:flex-col">
            <div className="border-b border-[#F0F2F6] p-5">
              <div className="h-24 animate-pulse rounded-2xl bg-[#F8F7FF]" />
            </div>
            <div className="border-b border-[#F0F2F6] px-3 py-3">
              <div className="flex items-center justify-around gap-2">
                {detailTabSkeletonIds.map((tabId) => (
                  <div
                    key={tabId}
                    className="h-8 flex-1 animate-pulse rounded-full bg-[#ECE9FF]"
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-hidden bg-white p-5">
              {detailCardSkeletonIds.map((cardId) => (
                <div key={cardId} className="rounded-2xl bg-[#F8F7FF] p-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-[#ECE9FF]" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#F4F5F8]" />
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[#F4F5F8]" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#F4F5F8]" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
