"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  DateRangeFilter,
  PaymentFilter,
} from "@/components/leads/hooks/useLeadsController";
import LeadsInlineSelect, {
  type LeadsInlineSelectOption,
} from "@/components/leads/LeadsInlineSelect";
import RowsPerPageDropdown from "@/components/leads/RowsPerPageDropdown";
import StatusMultiSelect from "@/components/leads/StatusMultiSelect";
import type { StatusType } from "@/types/status";
import type { TagRow } from "@/types/tags";

interface LeadsFilterBarProps {
  selectedStatuses: StatusType[];
  statusOptions: TagRow[];
  onToggleStatus: (status: StatusType) => void;
  getStatusCount: (status: StatusType) => number;
  dateRangeFilter: DateRangeFilter;
  onDateRangeFilterChange: (value: DateRangeFilter) => void;
  accountFilter: string;
  accountFilterOptions: readonly string[];
  onAccountFilterChange: (value: string) => void;
  paymentFilter: PaymentFilter;
  onPaymentFilterChange: (value: PaymentFilter) => void;
  currentPage: number;
  pageCount: number;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export default function LeadsFilterBar({
  selectedStatuses,
  statusOptions,
  onToggleStatus,
  getStatusCount,
  dateRangeFilter,
  onDateRangeFilterChange,
  accountFilter,
  accountFilterOptions,
  onAccountFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  currentPage,
  pageCount,
  rowsPerPage,
  rowsPerPageOptions,
  onPageChange,
  onRowsPerPageChange,
}: LeadsFilterBarProps) {
  const dateOptions: readonly LeadsInlineSelectOption<DateRangeFilter>[] = [
    { label: "Last 7 days", value: "7d" },
    { label: "Last 14 days", value: "14d" },
    { label: "Last 30 days", value: "30d" },
    { label: "More than 30 days", value: "gt30d" },
    { label: "All time", value: "all" },
  ];
  const accountOptions: readonly LeadsInlineSelectOption<string>[] =
    accountFilterOptions.map((account) => ({
      value: account,
      label: account === "all" ? "All accounts" : account,
    }));
  const paymentOptions: readonly LeadsInlineSelectOption<PaymentFilter>[] = [
    { label: "All payments", value: "all" },
    { label: "Paid only", value: "paid" },
    { label: "Unpaid", value: "unpaid" },
  ];

  const pageButtons = Array.from(
    { length: Math.min(pageCount, 5) },
    (_, index) => {
      if (pageCount <= 5) return index + 1;
      if (currentPage <= 3) return index + 1;
      if (currentPage >= pageCount - 2) return pageCount - 4 + index;
      return currentPage - 2 + index;
    },
  );

  return (
    <div className="border-b border-[#F0F2F6] bg-[#FBFBFD] px-4 py-3 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <LeadsInlineSelect
            value={dateRangeFilter}
            options={dateOptions}
            onChange={onDateRangeFilterChange}
            active={dateRangeFilter !== "7d"}
          />
          <LeadsInlineSelect
            value={accountFilter}
            options={accountOptions}
            onChange={onAccountFilterChange}
            active={accountFilter !== "all"}
          />
          <StatusMultiSelect
            selectedStatuses={selectedStatuses}
            statusOptions={statusOptions}
            onToggleStatus={onToggleStatus}
            getStatusCount={getStatusCount}
          />
          <LeadsInlineSelect
            value={paymentFilter}
            options={paymentOptions}
            onChange={onPaymentFilterChange}
            active={paymentFilter !== "all"}
          />
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <RowsPerPageDropdown
            value={rowsPerPage}
            options={rowsPerPageOptions}
            onChange={onRowsPerPageChange}
          />
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] bg-white text-[#606266]"
          >
            <ChevronLeft
              size={14}
              className={currentPage <= 1 ? "opacity-40" : ""}
            />
          </button>

          {pageButtons.map((page) => {
            const active = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm ${
                  active
                    ? "border-[#F0F2F6] bg-white font-semibold text-[#101011]"
                    : "border-transparent bg-transparent font-medium text-[#9A9CA2]"
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] bg-white text-[#606266]"
          >
            <ChevronRight
              size={14}
              className={currentPage >= pageCount ? "opacity-40" : ""}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
