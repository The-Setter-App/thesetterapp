import Link from "next/link";

export function SidebarNoConnectedAccountsState() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-800">
          No connected accounts yet
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Connect an Instagram account in Settings to start syncing.
        </p>
        <Link
          href="/settings"
          className="inline-flex mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800"
        >
          Go to Settings
        </Link>
      </div>
    </div>
  );
}

export function SidebarLoadingState() {
  const skeletonRows = Array.from({ length: 7 }, (_, index) => index);

  return (
    <div className="h-full bg-white">
      {skeletonRows.map((row) => (
        <div
          key={row}
          className="flex items-center gap-3 border-b border-[#F0F2F6] px-4 py-3"
        >
          <div className="h-10 w-10 animate-pulse rounded-full bg-[#F3F0FF]" />

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="h-3 w-24 animate-pulse rounded bg-[#ECE9FF]" />
              <div className="h-2.5 w-10 animate-pulse rounded bg-[#F0F2F6]" />
            </div>
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-[#F4F5F8]" />
          </div>

          <div className="h-6 w-14 animate-pulse rounded-full bg-[#F8F7FF]" />
        </div>
      ))}
    </div>
  );
}

interface SidebarEmptyStateProps {
  hasActiveFilters: boolean;
}

export function SidebarEmptyState({
  hasActiveFilters,
}: SidebarEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <p className="text-sm font-medium text-stone-500">
        {hasActiveFilters
          ? "No conversations match your filters."
          : "No conversations yet."}
      </p>
    </div>
  );
}
