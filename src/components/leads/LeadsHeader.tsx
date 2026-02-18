"use client";

import { CloudDownload, Search, Trash2 } from "lucide-react";

interface LeadsHeaderProps {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function LeadsHeader({
  totalCount,
  search,
  onSearchChange,
}: LeadsHeaderProps) {
  return (
    <div className="border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 md:py-5 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#101011] md:text-2xl">
              Leads
            </h1>
            <span className="rounded-full bg-[#F3F0FF] px-2.5 py-1 text-xs font-semibold text-[#8771FF]">
              {totalCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#606266] md:text-sm">
            One calendar showing all calls, outcomes, and revenue across your
            team.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-4 text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
          >
            <Trash2 size={15} />
            Delete
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-4 text-sm font-medium text-[#101011] transition-colors hover:bg-[#F8F7FF]"
          >
            <CloudDownload size={15} />
            Export
          </button>
          <div className="relative w-full sm:w-[220px] lg:w-[260px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
            />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white pl-9 pr-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
