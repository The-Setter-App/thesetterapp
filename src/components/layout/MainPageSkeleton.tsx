"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";

function DefaultSkeletonBody() {
  return (
    <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6 lg:px-8">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
            <div className="h-6 w-52 animate-pulse rounded bg-[#ECE9FF]" />
            <div className="mt-3 h-4 w-72 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-[#F8F7FF]" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
            <div className="h-5 w-36 animate-pulse rounded bg-[#ECE9FF]" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-xl bg-[#F4F5F8]" />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
          <div className="h-5 w-28 animate-pulse rounded bg-[#ECE9FF]" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-2xl bg-[#F8F7FF] p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-[#ECE9FF]" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#F4F5F8]" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-[#F4F5F8]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MainPageSkeleton() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011]">
      <PageHeaderSkeleton
        titleWidthClass="w-48"
        descriptionWidthClass="w-72"
        actions={
          <>
            <div className="h-11 w-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] sm:w-48" />
          </>
        }
      />
      <DefaultSkeletonBody />
    </div>
  );
}
