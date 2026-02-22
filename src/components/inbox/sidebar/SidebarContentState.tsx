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
  return (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <p className="text-sm font-medium text-stone-500">
        Loading conversations...
      </p>
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
