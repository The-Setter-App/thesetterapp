"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface LeadsPaginationProps {
  page: number;
  pageCount: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export default function LeadsPagination({
  page,
  pageCount,
  rowsPerPage,
  totalCount,
  onPageChange,
}: LeadsPaginationProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  const pageButtons = Array.from(
    { length: Math.min(pageCount, 5) },
    (_, index) => {
      if (pageCount <= 5) return index + 1;
      if (page <= 3) return index + 1;
      if (page >= pageCount - 2) return pageCount - 4 + index;
      return page - 2 + index;
    },
  );

  return (
    <div className="flex items-center justify-between border-t border-[#F0F2F6] bg-[#FBFBFD] px-4 py-3 md:px-6">
      <p className="text-xs text-[#606266] md:text-sm">
        Showing <span className="font-semibold text-[#101011]">{start}</span>-
        <span className="font-semibold text-[#101011]">{end}</span> of{" "}
        <span className="font-semibold text-[#101011]">{totalCount}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] bg-white text-[#606266]"
        >
          <ChevronLeft size={16} className={page <= 1 ? "opacity-40" : ""} />
        </button>

        {pageButtons.map((pageNumber) => {
          const active = pageNumber === page;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm ${
                active
                  ? "border-[#F0F2F6] bg-white font-semibold text-[#101011]"
                  : "border-transparent bg-transparent font-medium text-[#9A9CA2]"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] bg-white text-[#606266]"
        >
          <ChevronRight
            size={16}
            className={page >= pageCount ? "opacity-40" : ""}
          />
        </button>
      </div>
    </div>
  );
}
