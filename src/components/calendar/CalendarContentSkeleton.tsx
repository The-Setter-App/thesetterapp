interface CalendarContentSkeletonProps {
  // Kept for callers; both sizes share one layout.
  compact?: boolean;
}

const DAY_HEADER_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_CELL_IDS = Array.from(
  { length: 42 },
  (_, index) => `month-cell-${index + 1}`,
);
const MINI_CELL_IDS = Array.from(
  { length: 35 },
  (_, index) => `mini-cell-${index + 1}`,
);
const STAT_TILE_IDS = ["events", "confirmed", "pending", "pipeline"];
const UPCOMING_CARD_IDS = ["upcoming-1", "upcoming-2"];

// Cells that show a placeholder event, so the grid reads as a calendar.
const CELLS_WITH_EVENT = new Set([8, 9, 18, 33]);
const CELLS_WITH_SECOND_EVENT = new Set([8, 18]);

const PULSE = "animate-pulse rounded-full bg-[#F4F5F8]";

// Mirrors the month grid and side panel so the page does not jump when the
// events arrive.
export default function CalendarContentSkeleton(
  _props: CalendarContentSkeletonProps,
) {
  return (
    <div
      aria-busy="true"
      className="flex min-h-0 flex-1 overflow-hidden bg-white"
    >
      <span className="sr-only">Loading calendar</span>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-t border-[#F0F2F6]">
        <div className="grid grid-cols-7 border-b border-[#F0F2F6]">
          {DAY_HEADER_IDS.map((dayId) => (
            <div key={dayId} className="px-2 py-2.5">
              <div className={`mx-auto h-3 w-8 ${PULSE}`} />
            </div>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden">
          {MONTH_CELL_IDS.map((cellId, index) => (
            <div
              key={cellId}
              className="flex min-h-0 flex-col gap-1 border-b border-r border-[#F0F2F6] p-1.5 md:p-2 [&:nth-child(7n)]:border-r-0"
            >
              <div className="h-6 w-6 rounded-full bg-[#F4F5F8] md:h-7 md:w-7" />
              {CELLS_WITH_EVENT.has(index) && (
                <div className="h-5 w-full animate-pulse rounded-md bg-[#F3F0FF]" />
              )}
              {CELLS_WITH_SECOND_EVENT.has(index) && (
                <div className="h-5 w-4/5 animate-pulse rounded-md bg-[#F3F0FF]" />
              )}
            </div>
          ))}
        </div>
      </div>

      <aside className="hidden w-[320px] shrink-0 space-y-6 overflow-hidden border-l border-t border-[#F0F2F6] p-5 lg:block">
        <div>
          <div className="mb-3 h-4 w-28 animate-pulse rounded-full bg-[#ECE9FF]" />
          <div className="grid grid-cols-7 gap-y-0.5">
            {MINI_CELL_IDS.map((cellId) => (
              <div
                key={cellId}
                className="mx-auto h-8 w-8 animate-pulse rounded-full bg-[#F8F7FF]"
              />
            ))}
          </div>
        </div>

        <div>
          <div className={`mb-2.5 h-4 w-14 ${PULSE}`} />
          <div className="grid grid-cols-2 gap-2">
            {STAT_TILE_IDS.map((tileId) => (
              <div
                key={tileId}
                className="h-[5.5rem] animate-pulse rounded-2xl bg-[#F8F7FF]"
              />
            ))}
          </div>
        </div>

        <div>
          <div className={`mb-2.5 h-4 w-20 ${PULSE}`} />
          <div className="space-y-2">
            {UPCOMING_CARD_IDS.map((cardId) => (
              <div
                key={cardId}
                className="h-[4.25rem] animate-pulse rounded-2xl bg-[#F4F5F8]"
              />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
