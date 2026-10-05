"use client";

import { useLeadsController } from "@/components/leads/hooks/useLeadsController";
import LeadsBulkActionBar from "@/components/leads/LeadsBulkActionBar";
import LeadsFilterBar from "@/components/leads/LeadsFilterBar";
import LeadsHeader from "@/components/leads/LeadsHeader";
import LeadsListMobile from "@/components/leads/LeadsListMobile";
import LeadsPagination from "@/components/leads/LeadsPagination";
import LeadsTableDesktop from "@/components/leads/LeadsTableDesktop";
import surface from "@/components/ui/brandSurface.module.css";
import ScoopEmptyState from "@/components/ui/ScoopEmptyState";

interface LeadsMessageProps {
  children: string;
}

// A short centred line for the states that have no rows to show.
function LeadsMessage({ children }: LeadsMessageProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center text-sm font-medium text-[#606266]">
      {children}
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
    onClearSelection,
    onBulkApplyStatus,
    isBulkUpdating,
    selectedCount,
    headerCheckboxState,
    getStatusCount,
    onExport,
    exportCount,
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
    return (
      <div className={`${surface.surface} flex h-full`}>
        <ScoopEmptyState
          title="No connected accounts yet"
          description="Connect your Instagram account in Settings to load inbox leads."
          action={{ label: "Go to Settings", href: "/settings" }}
        />
      </div>
    );
  }

  const isInitialLoad = totalCount === 0 && !initialLoadSettled && loading;
  const hasRows = !error && totalCount > 0 && filteredRows.length > 0;

  return (
    // On phones the whole page scrolls so the header does not crowd out the
    // list; from `md` up only the table scrolls and the rest stays in place.
    <div
      className={`${surface.surface} flex h-full w-full flex-col overflow-y-auto text-[#101011] md:overflow-hidden`}
    >
      <LeadsHeader
        totalCount={filteredCount}
        search={search}
        onSearchChange={setSearch}
        exportCount={exportCount}
        exportsSelection={selectedCount > 0}
        onExport={onExport}
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
      />

      <LeadsBulkActionBar
        selectedCount={selectedCount}
        statusOptions={statusCatalog}
        isBulkUpdating={isBulkUpdating}
        onApplyStatus={onBulkApplyStatus}
        onClearSelection={onClearSelection}
      />

      {error ? (
        <div className="flex-1 px-4 md:px-6 lg:px-8">
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        </div>
      ) : isInitialLoad ? (
        <LeadsMessage>Loading leads...</LeadsMessage>
      ) : totalCount === 0 ? (
        <ScoopEmptyState
          title="No leads yet"
          description="Conversations synced in inbox will appear here automatically."
        />
      ) : filteredRows.length === 0 ? (
        <LeadsMessage>No leads match the current filters.</LeadsMessage>
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
          />
        </>
      )}

      {hasRows && (
        <LeadsPagination
          page={currentPage}
          pageCount={pageCount}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          totalCount={filteredCount}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </div>
  );
}
