interface CalendarContentSkeletonProps {
  compact?: boolean;
}

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const _EVENT_ROW_WIDTHS = ["w-full", "w-5/6", "w-4/5"] as const;
const SIDEBAR_STAT_CARD_CLASSES = [
  "bg-[#F8F7FF]",
  "bg-emerald-50",
  "bg-amber-50",
  "bg-[#F3F0FF]",
] as const;
const EVENT_TYPE_BADGE_CLASSES = [
  "bg-[#F3F0FF]",
  "bg-amber-50",
  "bg-sky-50",
  "bg-emerald-50",
  "bg-rose-50",
] as const;
const MINI_CALENDAR_CELL_IDS = Array.from(
  { length: 35 },
  (_, index) => `mini-cell-${index + 1}`,
);
const UPCOMING_CARD_IDS = ["upcoming-1", "upcoming-2"] as const;
const MONTH_CELL_IDS = Array.from(
  { length: 42 },
  (_, index) => `month-cell-${index + 1}`,
);

function MonthCellSkeleton({ index }: { index: number }) {
  const showPrimaryEvent =
    index === 8 || index === 9 || index === 18 || index === 33;
  const showSecondaryEvent = index === 8 || index === 18;
  const isTodayCell = index === 5;
  const isOutsideMonth = index >= 35;

  return (
    <div
      className={`flex min-h-[104px] flex-col border-b border-r border-[#F0F2F6] p-1.5 md:min-h-[124px] md:p-2 ${
        isOutsideMonth ? "bg-[#FAFBFD]" : "bg-white"
      }`}
    >
      <div
        className={`mb-2 ${isTodayCell ? "h-7 w-7 rounded-full bg-[#8771FF]/85" : "h-4 w-4 rounded bg-[#E9EAF0]"}`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        {showPrimaryEvent ? (
          <div className="h-5 w-full animate-pulse rounded bg-[#F3F0FF]" />
        ) : null}
        {showSecondaryEvent ? (
          <div className="h-5 w-4/5 animate-pulse rounded bg-[#EEE9FF]" />
        ) : null}
      </div>
    </div>
  );
}

function SidebarMiniCalendarSkeleton() {
  return (
    <div className="border-b border-[#F0F2F6] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-4 w-24 animate-pulse rounded bg-[#ECE9FF]" />
        <div className="flex gap-1">
          <div className="h-6 w-6 animate-pulse rounded-md bg-[#F4F5F8]" />
          <div className="h-6 w-6 animate-pulse rounded-md bg-[#F4F5F8]" />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="mx-auto h-2.5 w-4 animate-pulse rounded bg-[#F4F5F8]"
          />
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {MINI_CALENDAR_CELL_IDS.map((cellId, index) => (
          <div
            key={cellId}
            className={`h-7 animate-pulse rounded-md ${
              index === 5
                ? "bg-[#8771FF]/20"
                : index === 31 || index === 32 || index === 33 || index === 34
                  ? "bg-[#FBFBFD]"
                  : "bg-[#F8F7FF]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function SidebarOverviewSkeleton() {
  return (
    <div className="border-b border-[#F0F2F6] p-4">
      <div className="mb-3 h-3 w-28 animate-pulse rounded bg-[#F4F5F8]" />
      <div className="grid grid-cols-2 gap-2">
        {SIDEBAR_STAT_CARD_CLASSES.map((cardClass) => (
          <div
            key={cardClass}
            className={`rounded-xl border border-[#F0F2F6] p-3 ${cardClass}`}
          >
            <div className="mb-2 h-7 w-7 animate-pulse rounded-lg bg-white/80" />
            <div className="h-5 w-8 animate-pulse rounded bg-white/80" />
            <div className="mt-2 h-3 w-14 animate-pulse rounded bg-white/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarEventTypesSkeleton() {
  return (
    <div className="border-b border-[#F0F2F6] p-4">
      <div className="mb-3 h-3 w-20 animate-pulse rounded bg-[#F4F5F8]" />
      <div className="space-y-2">
        {EVENT_TYPE_BADGE_CLASSES.map((badgeClass) => (
          <div key={badgeClass} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 animate-pulse rounded-full ${badgeClass}`}
              />
              <div className="h-3 w-20 animate-pulse rounded bg-[#F4F5F8]" />
            </div>
            <div
              className={`h-4 w-5 animate-pulse rounded-full ${badgeClass}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarUpcomingSkeleton() {
  return (
    <div className="p-4">
      <div className="mb-3 h-3 w-16 animate-pulse rounded bg-[#F4F5F8]" />
      <div className="space-y-2">
        {UPCOMING_CARD_IDS.map((cardId) => (
          <div
            key={cardId}
            className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-3"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-[#ECE9FF]" />
            <div className="mt-3 h-4 w-20 animate-pulse rounded bg-[#F4F5F8]" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded bg-[#F4F5F8]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarContentSkeleton({
  compact = false,
}: CalendarContentSkeletonProps) {
  return (
    <div
      className={`flex min-h-0 flex-1 overflow-hidden bg-white ${compact ? "" : ""}`}
    >
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#F0F2F6] bg-white">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-[#9A9CA2]"
            >
              <div className="mx-auto h-3 w-8 animate-pulse rounded bg-[#F4F5F8]" />
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden bg-white">
          {MONTH_CELL_IDS.map((cellId, index) => (
            <MonthCellSkeleton key={cellId} index={index} />
          ))}
        </div>
      </div>

      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-[#F0F2F6] bg-white lg:flex">
        <div className="flex-1 overflow-hidden">
          <SidebarMiniCalendarSkeleton />
          <SidebarOverviewSkeleton />
          <SidebarEventTypesSkeleton />
          <SidebarUpcomingSkeleton />
        </div>
      </aside>
    </div>
  );
}
