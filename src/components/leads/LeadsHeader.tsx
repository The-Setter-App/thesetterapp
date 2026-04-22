"use client";

import { CloudDownload, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

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
    <PageHeader
      title="Leads"
      description="One calendar showing all calls, outcomes, and revenue across your team."
      titleBadge={
        <span className="rounded-full bg-[#F3F0FF] px-2.5 py-1 text-xs font-semibold text-[#8771FF]">
          {totalCount}
        </span>
      }
      actions={
        <>
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
              className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white pl-9 pr-3 text-sm text-[#101011] placeholder:text-[#9A9CA2] outline-none transition-colors hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
            />
          </div>
        </>
      }
    />
  );
}
