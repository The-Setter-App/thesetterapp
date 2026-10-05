"use client";

import { CloudDownload, Search, Trash2 } from "lucide-react";

interface LeadsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}

// Delete and Export are not built yet. They are shown disabled so they read
// as unavailable instead of as buttons that silently do nothing.
const UNAVAILABLE_ACTION_CLASS =
  "inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#F4F5F8] px-4 text-sm font-medium text-[#9A9CA2]";

export default function LeadsHeader({
  totalCount,
  search,
  onSearchChange,
}: LeadsHeaderProps) {
  return (
    <header className="flex shrink-0 flex-col gap-4 px-4 pb-4 pt-6 md:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.03em] text-[#101011]">
            Leads
          </h1>
          <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF] tabular-nums">
            {totalCount.toLocaleString()}
          </span>
        </div>
        <p className="mt-2 text-sm text-[#606266]">
          Every lead from your inbox, with status, cash collected and owner.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
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
        {/* Left off phones, where there is no room for unavailable actions. */}
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            disabled
            title="Coming soon"
            className={UNAVAILABLE_ACTION_CLASS}
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className={UNAVAILABLE_ACTION_CLASS}
          >
            <CloudDownload size={15} aria-hidden="true" />
            Export
          </button>
        </div>
      </div>
    </header>
  );
}
