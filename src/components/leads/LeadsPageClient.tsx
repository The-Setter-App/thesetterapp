"use client";

import Link from "next/link";
import LeadsFilterBar from "@/components/leads/LeadsFilterBar";
import LeadsHeader from "@/components/leads/LeadsHeader";
import LeadsListMobile from "@/components/leads/LeadsListMobile";
import LeadsTableDesktop from "@/components/leads/LeadsTableDesktop";
import { useLeadsController } from "@/components/leads/hooks/useLeadsController";

function NoConnectedAccountsState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">No connected accounts yet</h2>
        <p className="mt-1 text-sm text-stone-500">
          Connect your Instagram account in Settings to load inbox leads.
        </p>
        <Link
          href="/settings"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800"
        >
          Go to Settings
        </Link>
      </div>
    </div>
  );
}

function EmptyLeadsState() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">No leads yet</h2>
      <p className="mt-1 text-sm text-stone-500">
        Conversations synced in inbox will appear here automatically.
      </p>
    </div>
  );
}

export default function LeadsPageClient() {
  const {
    loading,
    initialLoadSettled,
    error,
    hasConnectedAccounts,
    filteredRows,
    search,
    setSearch,
    selectedStatuses,
    onToggleStatus,
    sortConfig,
    onSort,
    isSelected,
    onToggleSelect,
    onToggleAllVisible,
    headerCheckboxState,
    getStatusCount,
    totalCount,
    filteredCount,
  } = useLeadsController();

  if (!hasConnectedAccounts) {
    return <NoConnectedAccountsState />;
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 text-stone-900 md:px-6 md:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 md:gap-6">
        <LeadsHeader totalCount={filteredCount} search={search} onSearchChange={setSearch} />

        <LeadsFilterBar
          selectedStatuses={selectedStatuses}
          onToggleStatus={onToggleStatus}
          getStatusCount={getStatusCount}
        />

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
            {error}
          </div>
        ) : totalCount === 0 && !initialLoadSettled && loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500 shadow-sm">
            Loading leads...
          </div>
        ) : totalCount === 0 ? (
          <EmptyLeadsState />
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500 shadow-sm">
            No leads match the current filters.
          </div>
        ) : (
          <>
            <LeadsListMobile rows={filteredRows} isSelected={isSelected} onToggleSelect={onToggleSelect} />
            <LeadsTableDesktop
              rows={filteredRows}
              sortConfig={sortConfig}
              onSort={onSort}
              onToggleSelect={onToggleSelect}
              onToggleAllVisible={onToggleAllVisible}
              isSelected={isSelected}
              headerCheckboxState={headerCheckboxState}
            />
          </>
        )}
      </div>
    </div>
  );
}
