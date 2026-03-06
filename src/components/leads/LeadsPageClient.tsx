"use client";

import Link from "next/link";
import { useLeadsController } from "@/components/leads/hooks/useLeadsController";
import LeadsFilterBar from "@/components/leads/LeadsFilterBar";
import LeadsHeader from "@/components/leads/LeadsHeader";
import LeadsListMobile from "@/components/leads/LeadsListMobile";
import LeadsTableDesktop from "@/components/leads/LeadsTableDesktop";

function NoConnectedAccountsState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#F0F2F6] bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-[#101011]">
          No connected accounts yet
        </h2>
        <p className="mt-1 text-sm text-[#606266]">
          Connect your Instagram account in Settings to load inbox leads.
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

function EmptyLeadsState() {
  return (
    <div className="border-b border-[#F0F2F6] bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-[#101011]">No leads yet</h2>
      <p className="mt-1 text-sm text-[#606266]">
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
    paginatedRows,
    search,
    setSearch,
    selectedStatuses,
    statusCatalog,
    onToggleStatus,
    dateRangeFilter,
    onDateRangeFilterChange,
    accountFilter,
    accountFilterOptions,
    onAccountFilterChange,
    paymentFilter,
    onPaymentFilterChange,
    sortConfig,
    onSort,
    isSelected,
    onToggleSelect,
    onToggleAllVisible,
    headerCheckboxState,
    getStatusCount,
    totalCount,
    filteredCount,
    currentPage,
    pageCount,
    rowsPerPage,
    rowsPerPageOptions,
    onPageChange,
    onRowsPerPageChange,
  } = useLeadsController();

  if (!hasConnectedAccounts) {
    return <NoConnectedAccountsState />;
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-[#101011]">
      <div className="flex min-h-screen w-full flex-col">
        <LeadsHeader
          totalCount={filteredCount}
          search={search}
          onSearchChange={setSearch}
        />

        <LeadsFilterBar
          selectedStatuses={selectedStatuses}
          statusOptions={statusCatalog}
          onToggleStatus={onToggleStatus}
          getStatusCount={getStatusCount}
          dateRangeFilter={dateRangeFilter}
          onDateRangeFilterChange={onDateRangeFilterChange}
          accountFilter={accountFilter}
          accountFilterOptions={accountFilterOptions}
          onAccountFilterChange={onAccountFilterChange}
          paymentFilter={paymentFilter}
          onPaymentFilterChange={onPaymentFilterChange}
          currentPage={currentPage}
          pageCount={pageCount}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />

        {error ? (
          <div className="flex-1 border-b border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        ) : totalCount === 0 && !initialLoadSettled && loading ? (
          <div className="flex-1 border-b border-[#F0F2F6] bg-white p-8 text-center text-sm text-[#606266]">
            Loading leads...
          </div>
        ) : totalCount === 0 ? (
          <EmptyLeadsState />
        ) : filteredRows.length === 0 ? (
          <div className="flex-1 border-b border-[#F0F2F6] bg-white p-8 text-center text-sm text-[#606266]">
            No leads match the current filters.
          </div>
        ) : (
          <>
            <LeadsListMobile
              rows={paginatedRows}
              statusOptions={statusCatalog}
              isSelected={isSelected}
              onToggleSelect={onToggleSelect}
            />
            <LeadsTableDesktop
              rows={paginatedRows}
              statusOptions={statusCatalog}
              sortConfig={sortConfig}
              onSort={onSort}
              onToggleSelect={onToggleSelect}
              onToggleAllVisible={onToggleAllVisible}
              isSelected={isSelected}
              headerCheckboxState={headerCheckboxState}
              currentPage={currentPage}
              pageCount={pageCount}
              rowsPerPage={rowsPerPage}
              totalCount={filteredCount}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
