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
    <div className="mx-4 mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F3F0FF] px-4 py-2.5 md:mx-6 lg:mx-8">
      <p className="text-sm font-semibold text-[#101011] tabular-nums">
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
          className="h-10 rounded-full border border-transparent bg-white px-3.5 text-sm font-medium text-[#101011] outline-none transition-colors duration-150 focus:border-[#8771FF] focus:ring-0 disabled:opacity-60"
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
          <Loader2
            size={16}
            aria-label="Updating"
            className="animate-spin text-[#8771FF]"
          />
        )}

        <button
          type="button"
          onClick={onClearSelection}
          disabled={isBulkUpdating}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-[#8771FF] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-60 [@media(hover:hover)]:enabled:hover:bg-white/70"
        >
          <X size={14} aria-hidden="true" />
          Clear
        </button>
      </div>
    </div>
  );
}
