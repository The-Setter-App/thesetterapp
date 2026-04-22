"use client";

import CalendarContentSkeleton from "@/components/calendar/CalendarContentSkeleton";

export default function CalendarPageSkeleton() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col bg-white text-[#101011]">
      <div className="border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 md:py-5 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-32 animate-pulse rounded bg-[#ECE9FF]" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-[#F3F0FF]" />
            </div>
            <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F4F5F8]" />
          </div>
        </div>
      </div>

      <div className="border-b border-[#F0F2F6] bg-white px-4 py-3 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-16 animate-pulse rounded-xl bg-[#F4F5F8]" />
            <div className="flex items-center">
              <div className="h-9 w-9 animate-pulse rounded-l-xl bg-[#F4F5F8]" />
              <div className="ml-px h-9 w-9 animate-pulse rounded-r-xl bg-[#F4F5F8]" />
            </div>
            <div className="h-5 w-28 animate-pulse rounded bg-[#ECE9FF]" />
          </div>
          <div className="inline-flex h-10 items-center rounded-xl border border-[#E8E8EC] bg-[#F5F5F7] p-1 shadow-sm">
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white" />
            <div className="ml-1 h-8 w-16 animate-pulse rounded-lg bg-[#F5F5F7]" />
            <div className="ml-1 h-8 w-14 animate-pulse rounded-lg bg-[#F5F5F7]" />
          </div>
        </div>
      </div>

      <CalendarContentSkeleton compact />
    </div>
  );
}
