"use client";

const integrationColumnKeys = ["name", "status", "sync", "action"] as const;
const integrationRowKeys = ["instagram", "calendar", "crm"] as const;
const socialsAccountKeys = ["primary-account", "secondary-account"] as const;
const socialsDetailKeys = [
  "page-id",
  "ig-user",
  "graph-version",
  "updated-at",
  "token",
] as const;
const tagMetricKeys = ["total", "custom", "default"] as const;
const tagTableColumnKeys = [
  "status",
  "source",
  "description",
  "color",
  "created",
  "actions",
] as const;
const tagTableRowKeys = [
  "new-lead",
  "qualified",
  "booked",
  "won",
  "retarget",
  "custom",
] as const;
const teamSummaryKeys = ["workspace-owner", "current-role"] as const;
const teamMemberKeys = [
  "setter-member",
  "closer-member",
  "support-member",
] as const;

function SkeletonBox({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-[#E8E9EE] ${className}`} />;
}

function SettingsSectionSkeletonHeader() {
  return (
    <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
      <SkeletonBox className="h-6 w-48" />
      <SkeletonBox className="mt-2 h-4 w-80 max-w-full" />
    </div>
  );
}

export function SettingsProfileContentSkeleton() {
  return (
    <div className="max-w-5xl space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <SettingsSectionSkeletonHeader />

        <div className="px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
                <SkeletonBox className="h-3 w-16" />
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-white" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-28" />
                    <SkeletonBox className="h-3 w-36" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                <SkeletonBox className="mb-2 h-3 w-24" />
                <div className="space-y-2">
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-3">
                    <SkeletonBox className="h-3 w-14" />
                    <SkeletonBox className="mt-2 h-3 w-32" />
                  </div>
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-3">
                    <SkeletonBox className="h-3 w-12" />
                    <div className="mt-2 h-6 w-20 animate-pulse rounded-full bg-[#F3F0FF]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4 md:p-5">
              <SkeletonBox className="h-4 w-28" />
              <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8]" />
              <SkeletonBox className="mt-2 h-3 w-14" />
              <div className="mt-4 rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="h-11 w-32 animate-pulse rounded-xl bg-[#F3F0FF]" />
                  <div className="h-11 w-24 animate-pulse rounded-xl bg-white" />
                </div>
                <SkeletonBox className="mt-2 h-3 w-28" />
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

export function SettingsIntegrationContentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <SettingsSectionSkeletonHeader />
        <div className="px-4 py-6 md:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#F0F2F6]">
            <div className="border-b border-[#F0F2F6] bg-[#F8F7FF] px-4 py-4">
              <div className="grid grid-cols-[minmax(0,1.5fr)_120px_120px_120px] gap-3">
                {integrationColumnKeys.map((columnKey) => (
                  <SkeletonBox key={columnKey} className="h-4 w-full" />
                ))}
              </div>
            </div>
            <div className="space-y-0 bg-white">
              {integrationRowKeys.map((rowKey) => (
                <div
                  key={rowKey}
                  className="grid grid-cols-1 gap-4 border-b border-[#F0F2F6] px-4 py-5 md:grid-cols-[minmax(0,1.5fr)_120px_120px_120px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-2xl bg-[#F3F0FF]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonBox className="h-4 w-32" />
                      <SkeletonBox className="h-3 w-56 max-w-full" />
                    </div>
                  </div>
                  <SkeletonBox className="h-9 w-24 rounded-full" />
                  <SkeletonBox className="h-9 w-20 rounded-xl" />
                  <SkeletonBox className="h-9 w-24 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSocialsContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 animate-pulse rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF]" />

      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <SettingsSectionSkeletonHeader />

        <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#F3F0FF]" />
              <div className="space-y-2">
                <SkeletonBox className="h-4 w-40" />
                <SkeletonBox className="h-3 w-64 max-w-full" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBox className="h-9 w-32 rounded-full" />
              <SkeletonBox className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 md:px-8">
          {socialsAccountKeys.map((accountKey) => (
            <div
              key={accountKey}
              className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4 md:p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="h-6 w-16 rounded-full" />
                    <SkeletonBox className="h-4 w-40" />
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {socialsDetailKeys.map((detailKey) => (
                      <div
                        key={detailKey}
                        className="flex items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-3 py-3"
                      >
                        <div className="h-4 w-4 animate-pulse rounded bg-[#ECE9FF]" />
                        <SkeletonBox className="h-3 w-32" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-10 w-full animate-pulse rounded-xl bg-white md:w-32" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end border-t border-[#F0F2F6] bg-[#FAFAFF] px-6 py-6 md:px-8">
          <div className="h-12 w-full animate-pulse rounded-xl bg-[#8771FF]/20 md:w-52" />
        </div>
      </div>
    </div>
  );
}

export function SettingsTagsContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-14 animate-pulse rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF]" />

      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <SettingsSectionSkeletonHeader />

        <div className="grid grid-cols-1 gap-4 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-3 md:px-8">
          {tagMetricKeys.map((metricKey) => (
            <div
              key={metricKey}
              className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-4"
            >
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="mt-2 h-8 w-12" />
              <SkeletonBox className="mt-1 h-3 w-28" />
            </div>
          ))}
        </div>

        <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_140px_80px_auto] md:items-end">
            <div>
              <SkeletonBox className="mb-1 h-3 w-20" />
              <div className="h-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div>
              <SkeletonBox className="mb-1 h-3 w-24" />
              <div className="h-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div>
              <SkeletonBox className="mb-1 h-3 w-14" />
              <div className="h-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div>
              <SkeletonBox className="mb-1 h-3 w-12" />
              <div className="h-11 w-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div className="h-12 w-full animate-pulse rounded-xl bg-[#8771FF]/20 md:w-32" />
          </div>
          <SkeletonBox className="mt-3 h-3 w-64 max-w-full" />
        </div>

        <div className="px-6 py-6 md:px-8">
          <div className="overflow-hidden rounded-2xl border border-[#F0F2F6]">
            <div className="grid grid-cols-[1.4fr_120px_1.5fr_120px_140px_100px] gap-3 bg-[#F8F7FF] px-4 py-3">
              {tagTableColumnKeys.map((columnKey) => (
                <SkeletonBox key={columnKey} className="h-3 w-full" />
              ))}
            </div>
            {tagTableRowKeys.map((rowKey) => (
              <div
                key={rowKey}
                className="grid grid-cols-[1.4fr_120px_1.5fr_120px_140px_100px] gap-3 border-t border-[#F0F2F6] px-4 py-4"
              >
                <div className="flex items-center">
                  <SkeletonBox className="h-6 w-28 rounded-full" />
                </div>
                <SkeletonBox className="h-6 w-16 rounded-full" />
                <SkeletonBox className="h-4 w-full" />
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-[#ECE9FF]" />
                  <SkeletonBox className="h-3 w-16" />
                </div>
                <div className="space-y-2">
                  <SkeletonBox className="h-3 w-24" />
                  <SkeletonBox className="h-3 w-16" />
                </div>
                <SkeletonBox className="h-9 w-12 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsTeamContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 animate-pulse rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF]" />

      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <SettingsSectionSkeletonHeader />

        <div className="grid grid-cols-1 gap-4 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-2 md:px-8">
          {teamSummaryKeys.map((summaryKey) => (
            <div
              key={summaryKey}
              className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-[#ECE9FF]" />
                <SkeletonBox className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-6 w-16 rounded-full" />
                <SkeletonBox className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>

        <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-4 w-4 animate-pulse rounded bg-[#ECE9FF]" />
            <SkeletonBox className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
            <div>
              <SkeletonBox className="mb-1 h-3 w-28" />
              <div className="h-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div>
              <SkeletonBox className="mb-1 h-3 w-10" />
              <div className="h-11 animate-pulse rounded-xl bg-[#F4F5F8]" />
            </div>
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#8771FF]/20 md:w-32" />
          </div>
        </div>

        <div className="px-6 py-6 md:px-8">
          <SkeletonBox className="mb-4 h-4 w-24" />

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-3">
              <div className="min-w-0 space-y-2">
                <SkeletonBox className="h-4 w-48" />
                <SkeletonBox className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-[#ECE9FF]" />
                <SkeletonBox className="h-6 w-16 rounded-full" />
              </div>
            </div>

            {teamMemberKeys.map((memberKey) => (
              <div
                key={memberKey}
                className="flex items-center justify-between rounded-2xl border border-[#F0F2F6] bg-white px-4 py-3"
              >
                <div className="min-w-0 space-y-2">
                  <SkeletonBox className="h-4 w-44" />
                  <SkeletonBox className="h-3 w-28" />
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <SkeletonBox className="h-6 w-16 rounded-full" />
                  <div className="h-9 w-9 animate-pulse rounded-lg bg-[#F4F5F8]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
