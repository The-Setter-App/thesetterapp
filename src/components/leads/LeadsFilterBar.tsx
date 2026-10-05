"use client";

import type {
  DateRangeFilter,
  PaymentFilter,
} from "@/components/leads/hooks/useLeadsController";
import LeadsInlineSelect, {
  type LeadsInlineSelectOption,
} from "@/components/leads/LeadsInlineSelect";
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
}

const DATE_OPTIONS: readonly LeadsInlineSelectOption<DateRangeFilter>[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "More than 30 days", value: "gt30d" },
  { label: "All time", value: "all" },
];

const PAYMENT_OPTIONS: readonly LeadsInlineSelectOption<PaymentFilter>[] = [
  { label: "All payments", value: "all" },
  { label: "Paid only", value: "paid" },
  { label: "Unpaid", value: "unpaid" },
];

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
}: LeadsFilterBarProps) {
  const accountOptions: readonly LeadsInlineSelectOption<string>[] =
    accountFilterOptions.map((account) => ({
      value: account,
      label: account === "all" ? "All accounts" : account,
    }));

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-4 md:px-6 lg:px-8">
      <LeadsInlineSelect
        value={dateRangeFilter}
        options={DATE_OPTIONS}
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
        options={PAYMENT_OPTIONS}
        onChange={onPaymentFilterChange}
        active={paymentFilter !== "all"}
      />
    </div>
  );
}
