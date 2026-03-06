"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";

export default function SetterAiPageSkeleton() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011]">
      <PageHeaderSkeleton
        titleWidthClass="w-36"
        descriptionWidthClass="w-96"
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="w-full border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 lg:h-full lg:w-[320px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="h-3 w-20 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="h-10 animate-pulse rounded-xl bg-[#F4F5F8]" />
            <div className="h-11 animate-pulse rounded-xl bg-[#F3F0FF]" />
            <div className="min-h-[220px] flex-1 space-y-2 overflow-hidden">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                  className="rounded-xl border border-[#F0F2F6] bg-white px-3 py-3"
              >
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-[#EEEAFD]" />
                    <div className="min-w-0 flex-1">
                      <div className="h-3 w-32 animate-pulse rounded bg-[#ECE9FF]" />
                    </div>
                  </div>
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col bg-[#F8F7FF]">
          <div className="min-h-0 flex-1 overflow-hidden px-4 md:px-6">
            <div className="mx-auto flex h-full w-full flex-col gap-4 pb-12 pt-3 md:w-[48%] md:pt-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`h-16 animate-pulse rounded-2xl ${
                      index % 2 === 0
                        ? "w-[72%] border border-[#F0F2F6] bg-white"
                        : "w-[72%] bg-[#F3F0FF]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#F0F2F6] bg-white px-4 py-4 md:px-6">
            <div className="mx-auto w-full md:w-[48%]">
              <div className="h-12 animate-pulse rounded-2xl bg-[#F4F5F8]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
