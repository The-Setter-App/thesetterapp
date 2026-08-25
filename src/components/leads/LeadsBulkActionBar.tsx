"use client";

import { Loader2, X } from "lucide-react";
import type { StatusType } from "@/types/status";
import type { TagRow } from "@/types/tags";

interface LeadsBulkActionBarProps {
  selectedCount: number;
  statusOptions: TagRow[];
  isBulkUpdating: boolean;
  onApplyStatus: (status: StatusType) => void;
  onClearSelection: () => void;
}

export default function LeadsBulkActionBar({
  selectedCount,
  statusOptions,
  isBulkUpdating,
  onApplyStatus,
  onClearSelection,
}: LeadsBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D2FF] bg-[#F3F0FF] px-4 py-3 md:px-6">
      <p className="text-sm font-medium text-[#101011]">
        {selectedCount} lead{selectedCount === 1 ? "" : "s"} selected
      </p>

      <div className="flex items-center gap-2">
        <label htmlFor="bulk-status-select" className="sr-only">
          Change status for selected leads
        </label>
        <select
          id="bulk-status-select"
          defaultValue=""
          disabled={isBulkUpdating}
          onChange={(event) => {
            const value = event.target.value;
            if (!value) return;
            onApplyStatus(value);
            event.target.value = "";
          }}
          className="h-10 rounded-xl border border-[#D8D2FF] bg-white px-3 text-sm font-medium text-[#101011] outline-none transition-colors disabled:opacity-60"
        >
          <option value="" disabled>
            Change status to...
          </option>
          {statusOptions.map((status) => (
            <option key={status.id} value={status.name}>
              {status.name}
            </option>
          ))}
        </select>

        {isBulkUpdating && (
          <Loader2 size={16} className="animate-spin text-[#8771FF]" />
        )}

        <button
          type="button"
          onClick={onClearSelection}
          disabled={isBulkUpdating}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm font-medium text-[#606266] transition-colors hover:bg-[#F8F7FF] disabled:opacity-60"
        >
          <X size={14} />
          Clear
        </button>
      </div>
    </div>
  );
}
