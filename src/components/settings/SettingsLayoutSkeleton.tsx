"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";

function SettingsSidebarSkeleton() {
  return (
    <aside className="h-auto border-r border-[#F0F2F6] bg-white md:h-full">
      <div className="flex h-full flex-col p-4 md:p-6">
        <nav className="flex gap-2 overflow-x-auto md:block md:space-y-2 md:overflow-visible">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`h-12 min-w-[120px] animate-pulse rounded-xl border px-4 md:w-full ${
                index === 0
                  ? "border-[#D8D2FF] bg-[#F3F0FF]"
                  : "border-[#F0F2F6] bg-white"
              }`}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function SettingsProfileContentSkeleton() {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="h-6 w-48 animate-pulse rounded bg-[#E8E9EE]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#E8E9EE]" />
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
                <div className="h-3 w-16 animate-pulse rounded bg-[#E8E9EE]" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-white" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-[#E8E9EE]" />
                    <div className="h-3 w-36 animate-pulse rounded bg-[#E8E9EE]" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                <div className="mb-2 h-3 w-24 animate-pulse rounded bg-[#E8E9EE]" />
                <div className="space-y-2">
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-3">
                    <div className="h-3 w-14 animate-pulse rounded bg-[#E8E9EE]" />
                    <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[#E8E9EE]" />
                  </div>
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-3">
                    <div className="h-3 w-12 animate-pulse rounded bg-[#E8E9EE]" />
                    <div className="mt-2 h-6 w-20 animate-pulse rounded-full bg-[#F3F0FF]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4 md:p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-[#E8E9EE]" />
              <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8]" />
              <div className="mt-2 h-3 w-14 animate-pulse rounded bg-[#E8E9EE]" />
              <div className="mt-4 rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-11 w-32 animate-pulse rounded-xl bg-[#F3F0FF]" />
                  <div className="h-11 w-24 animate-pulse rounded-xl bg-white" />
                </div>
                <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#E8E9EE]" />
              </div>
              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="h-7 w-36 animate-pulse rounded-full bg-[#F8F7FF]" />
                <div className="h-12 w-full animate-pulse rounded-xl bg-[#8771FF]/20 md:w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsLayoutSkeleton() {
  return (
    <div className="flex h-full min-h-screen flex-col overflow-hidden bg-white text-[#101011]">
      <PageHeaderSkeleton
        titleWidthClass="w-28"
        descriptionWidthClass="w-[360px]"
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="shrink-0 md:h-full">
          <SettingsSidebarSkeleton />
        </div>

        <section className="min-h-0 overflow-y-auto bg-white">
          <div className="w-full px-4 py-6 md:px-8 md:py-8 lg:px-10">
            <SettingsProfileContentSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}
