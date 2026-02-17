"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface LeadsPaginationProps {
  count: number;
}

export default function LeadsPagination({ count }: LeadsPaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-4 py-3 md:px-6">
      <p className="text-xs text-stone-500 md:text-sm">
        Showing <span className="font-semibold text-stone-900">{count}</span> results
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-semibold text-stone-900"
        >
          1
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-sm font-medium text-stone-600"
        >
          2
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
