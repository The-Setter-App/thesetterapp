import Link from "next/link";

export function SidebarNoConnectedAccountsState() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#101011]">
          No connected accounts yet
        </p>
        <p className="mt-1 text-xs text-[#606266]">
          Connect an Instagram account in Settings to start syncing.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-[#8771FF] px-4 text-sm font-medium text-white transition-colors hover:bg-[#6d5ed6]"
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
      <p className="text-sm font-medium text-[#606266]">
        {hasActiveFilters
          ? "No conversations match your filters."
          : "No conversations yet."}
      </p>
    </div>
  );
}
