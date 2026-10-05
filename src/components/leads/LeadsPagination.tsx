"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import RowsPerPageDropdown from "@/components/leads/RowsPerPageDropdown";
import { getPageWindow } from "@/lib/leads/pageWindow";

interface LeadsPaginationProps {
  page: number;
  pageCount: number;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

const STEP_BUTTON_CLASS =
  "flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.94] disabled:opacity-40 [@media(hover:hover)]:enabled:hover:bg-[#ECEEF3]";

// The bar under the leads: how many are showing, how many per page, and the
// page controls. Shown under both the table and the phone list.
export default function LeadsPagination({
  page,
  pageCount,
  rowsPerPage,
  rowsPerPageOptions,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
}: LeadsPaginationProps) {
  const start = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalCount);

  return (
    <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#F0F2F6] bg-white px-4 py-3 md:static md:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <p className="text-[0.8125rem] text-[#606266] tabular-nums">
          <span className="font-semibold text-[#101011]">
            {start}–{end}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-[#101011]">
            {totalCount.toLocaleString()}
          </span>
        </p>
        <RowsPerPageDropdown
          value={rowsPerPage}
          options={rowsPerPageOptions}
          onChange={onRowsPerPageChange}
        />
      </div>

      <nav aria-label="Pages" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={STEP_BUTTON_CLASS}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        {getPageWindow(page, pageCount).map((pageNumber) => {
          const active = pageNumber === page;
          return (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm tabular-nums outline-none transition-colors duration-100 ${
                active
                  ? "bg-[#F3F0FF] font-semibold text-[#8771FF]"
                  : "font-medium text-[#606266] [@media(hover:hover)]:hover:bg-[#F8F7FF]"
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
          aria-label="Next page"
          className={STEP_BUTTON_CLASS}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
