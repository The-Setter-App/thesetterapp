"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";

export default function DashboardPageSkeleton() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-white text-[#101011]">
      <PageHeaderSkeleton
        titleWidthClass="w-48"
        descriptionWidthClass="w-40"
        actions={
          <>
            <div className="h-11 w-11 animate-pulse rounded-full bg-[#F4F5F8]" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] sm:w-[260px]" />
          </>
        }
      />

      <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.10)] p-4 shadow-sm md:p-5"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 animate-pulse rounded-full bg-[rgba(82,53,239,0.18)]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-6 w-24 animate-pulse rounded bg-white/80" />
                  <div className="h-4 w-20 animate-pulse rounded bg-white/70" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[rgba(135,113,255,0.2)] bg-white">
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <div className="h-full w-full bg-[linear-gradient(180deg,rgba(135,113,255,0.05)_0%,rgba(135,113,255,0.16)_100%)] [clip-path:polygon(0_22%,100%_10%,100%_72%,0_86%)]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index, array) => (
              <div
                key={index}
                className={`relative z-10 space-y-3 p-4 md:p-5 lg:h-[357px] lg:p-6 ${index !== array.length - 1 ? "border-b border-[rgba(135,113,255,0.2)] md:border-b-0 md:border-r" : ""}`}
              >
                <div className="h-4 w-24 animate-pulse rounded bg-[#F4F5F8]" />
                <div className="h-8 w-20 animate-pulse rounded bg-[#ECE9FF]" />
                <div className="hidden h-[220px] rounded-2xl bg-transparent lg:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
