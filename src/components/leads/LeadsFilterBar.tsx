"use client";

import { ChevronDown } from "lucide-react";
import StatusMultiSelect from "@/components/leads/StatusMultiSelect";
import type { StatusType } from "@/types/status";

interface LeadsFilterBarProps {
  selectedStatuses: StatusType[];
  onToggleStatus: (status: StatusType) => void;
  getStatusCount: (status: StatusType) => number;
}

function FilterButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex h-11 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 hover:bg-stone-50"
    >
      {label}
      <ChevronDown size={16} className="text-stone-500" />
    </button>
  );
}

export default function LeadsFilterBar({
  selectedStatuses,
  onToggleStatus,
  getStatusCount,
}: LeadsFilterBarProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FilterButton label="Last 7 days" />
        <FilterButton label="All accounts" />
        <StatusMultiSelect
          selectedStatuses={selectedStatuses}
          onToggleStatus={onToggleStatus}
          getStatusCount={getStatusCount}
        />
        <FilterButton label="All payments" />
      </div>
    </div>
  );
}
