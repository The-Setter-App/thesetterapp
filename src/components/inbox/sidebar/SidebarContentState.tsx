import Link from "next/link";

export function SidebarNoConnectedAccountsState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center">
        <p className="text-base font-semibold text-[#101011]">
          No connected accounts yet
        </p>
        <p className="mt-1 text-sm text-[#606266]">
          Connect an Instagram account in Settings to start syncing.
        </p>
        <Link
          href="/settings"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
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
    <div className="h-full space-y-1 px-1 md:px-3 lg:px-5">
      {skeletonRows.map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-2xl p-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#F3F0FF]" />

          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-28 animate-pulse rounded-full bg-[#ECE9FF]" />
            <div className="mt-2.5 h-3 w-4/5 animate-pulse rounded-full bg-[#F4F5F8]" />
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="h-2.5 w-8 animate-pulse rounded-full bg-[#F0F2F6]" />
            <div className="h-5 w-14 animate-pulse rounded-full bg-[#F8F7FF]" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SidebarEmptyStateProps {
  hasActiveFilters: boolean;
  // The to-do list being empty is good news, so it gets its own wording.
  isTodoTab?: boolean;
}

export function SidebarEmptyState({
  hasActiveFilters,
  isTodoTab = false,
}: SidebarEmptyStateProps) {
  if (isTodoTab) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <p className="text-base font-semibold text-[#101011]">
            You're all caught up
          </p>
          <p className="mt-1 text-sm text-[#606266]">
            No lead is waiting on a reply or due a follow-up.
          </p>
        </div>
      </div>
    );
  }

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
