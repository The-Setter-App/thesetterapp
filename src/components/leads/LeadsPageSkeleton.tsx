"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";

const TABLE_HEADER_IDS = [
  "lead-header-1",
  "lead-header-2",
  "lead-header-3",
  "lead-header-4",
  "lead-header-5",
  "lead-header-6",
  "lead-header-7",
  "lead-header-8",
] as const;
const MOBILE_CARD_IDS = [
  "mobile-card-1",
  "mobile-card-2",
  "mobile-card-3",
  "mobile-card-4",
  "mobile-card-5",
] as const;
const MOBILE_CARD_CELL_IDS = [
  "mobile-card-cell-1",
  "mobile-card-cell-2",
  "mobile-card-cell-3",
  "mobile-card-cell-4",
] as const;
const TABLE_ROW_IDS = [
  "table-row-1",
  "table-row-2",
  "table-row-3",
  "table-row-4",
  "table-row-5",
  "table-row-6",
  "table-row-7",
  "table-row-8",
] as const;
const FILTER_PILL_IDS = [
  "filter-pill-1",
  "filter-pill-2",
  "filter-pill-3",
  "filter-pill-4",
] as const;
const TOOL_BUTTON_IDS = [
  "tool-button-1",
  "tool-button-2",
  "tool-button-3",
] as const;

function LeadsTableSkeleton() {
  return (
    <section className="overflow-hidden border-b border-[#F0F2F6] bg-white">
      <div className="hidden grid-cols-[44px_minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] gap-4 border-b border-[#F0F2F6] px-4 py-3 md:grid lg:px-8">
        {TABLE_HEADER_IDS.map((headerId) => (
          <div
            key={headerId}
            className="h-4 animate-pulse rounded bg-[#F4F5F8]"
          />
        ))}
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {MOBILE_CARD_IDS.map((cardId) => (
          <div
            key={cardId}
            className="rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-32 animate-pulse rounded bg-[#ECE9FF]" />
                <div className="mt-2 h-3 w-24 animate-pulse rounded bg-[#F4F5F8]" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#F3F0FF]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {MOBILE_CARD_CELL_IDS.map((cellId) => (
                <div
                  key={cellId}
                  className="space-y-2 rounded-xl bg-[#F8F7FF] p-3"
                >
                  <div className="h-3 w-16 animate-pulse rounded bg-[#F4F5F8]" />
                  <div className="h-4 w-20 animate-pulse rounded bg-[#ECE9FF]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        {TABLE_ROW_IDS.map((rowId) => (
          <div
            key={rowId}
            className="grid grid-cols-[44px_minmax(0,1.25fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,0.85fr)] items-center gap-4 border-b border-[#F0F2F6] px-4 py-4 lg:px-8"
          >
            <div className="h-4 w-4 animate-pulse rounded bg-[#ECE9FF]" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-[#ECE9FF]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[#F4F5F8]" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-[#F3F0FF]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="h-4 w-20 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="h-4 w-16 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="h-4 w-20 animate-pulse rounded bg-[#F4F5F8]" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function LeadsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] text-[#101011]">
      <div className="flex min-h-screen w-full flex-col">
        <PageHeaderSkeleton
          titleWidthClass="w-28"
          descriptionWidthClass="w-[360px]"
          titleBadge={
            <div className="h-6 w-10 animate-pulse rounded-full bg-[#F3F0FF]" />
          }
          actions={
            <>
              <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] sm:w-24" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] sm:w-24" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] sm:w-[260px]" />
            </>
          }
        />

        <div className="border-b border-[#F0F2F6] bg-[#FBFBFD] px-4 py-3 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_PILL_IDS.map((pillId) => (
                <div
                  key={pillId}
                  className="h-9 w-28 animate-pulse rounded-full bg-[#F3F0FF]"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <div className="h-9 w-20 animate-pulse rounded-lg bg-white shadow-sm" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-white shadow-sm" />
              {TOOL_BUTTON_IDS.map((buttonId) => (
                <div
                  key={buttonId}
                  className="h-9 w-9 animate-pulse rounded-lg bg-white shadow-sm"
                />
              ))}
              <div className="h-9 w-9 animate-pulse rounded-lg bg-white shadow-sm" />
            </div>
          </div>
        </div>

        <LeadsTableSkeleton />
      </div>
    </div>
  );
}
