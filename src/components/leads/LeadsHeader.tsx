"use client";

import { CloudDownload, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

interface LeadsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  // How many leads an export would contain right now.
  exportCount: number;
  // True when the export covers ticked leads instead of the filtered list.
  exportsSelection: boolean;
  onExport: () => void;
}

// Delete is not built yet. It is shown disabled so it reads as unavailable
// instead of as a button that silently does nothing.
const UNAVAILABLE_ACTION_CLASS =
  "h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#F4F5F8] px-4 text-sm font-medium text-[#9A9CA2]";

export default function LeadsHeader({
  totalCount,
  search,
  onSearchChange,
  exportCount,
  exportsSelection,
  onExport,
}: LeadsHeaderProps) {
  const exportHint =
    exportCount === 0
      ? "No leads to export"
      : `Download ${exportCount.toLocaleString()} ${
          exportsSelection ? "selected" : "filtered"
        } lead${exportCount === 1 ? "" : "s"} as a CSV file`;

  return (
    <PageHeader
      divider={false}
      className="shrink-0 pb-4"
      title="Leads"
      description="Every lead from your inbox, with status, cash collected and owner."
      titleBadge={
        <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF] tabular-nums">
          {totalCount.toLocaleString()}
        </span>
      }
      actions={
        <>
          <label className="relative w-full sm:flex-1 lg:w-[280px] lg:flex-none">
            <span className="sr-only">Search leads</span>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
            />
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-10 pr-4 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
            />
          </label>
          <div className="flex gap-2">
            {/* Left off phones, where there is no room for an unavailable action. */}
            <button
              type="button"
              disabled
              title="Coming soon"
              className={`${UNAVAILABLE_ACTION_CLASS} hidden sm:inline-flex`}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exportCount === 0}
              title={exportHint}
              aria-label={exportHint}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F3F0FF] px-4 text-sm font-semibold text-[#8771FF] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[#F4F5F8] disabled:text-[#9A9CA2] disabled:active:scale-100 sm:w-auto [@media(hover:hover)]:enabled:hover:bg-[#EBE5FF]"
            >
              <CloudDownload size={15} aria-hidden="true" />
              Export
            </button>
          </div>
        </>
      }
    />
  );
}
