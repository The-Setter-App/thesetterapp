"use client";

export default function CallsTabSkeleton() {
  const skeletonKeys = ["one", "two", "three"] as const;

  return (
    <div className="p-6 bg-[#F8F7FF] h-full overflow-y-auto">
      <div className="space-y-4">
        {skeletonKeys.map((key) => (
          <div
            key={`calls-skeleton-${key}`}
            className="rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="h-4 w-40 animate-pulse rounded bg-[#F0F2F6]" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-[#F3F0FF]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-[#F0F2F6]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#F0F2F6]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#F0F2F6]" />
            </div>
            <div className="mt-4 flex justify-end">
              <div className="h-9 w-24 animate-pulse rounded-full bg-[#F3F0FF]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
