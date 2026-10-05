import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import surface from "@/components/ui/brandSurface.module.css";

const STAT_TILE_IDS = ["reply-time", "revenue-call", "rate", "reply-rate"];
const PIPELINE_ROW_WIDTHS = ["100%", "78%", "56%", "38%", "22%"];
const OFF_FUNNEL_ROW_IDS = ["unqualified", "no-show", "deposit"];
const PAYMENT_TILE_IDS = ["upcoming", "recent"];

const PULSE = "animate-pulse rounded-full bg-[#F0F2F6]";
const TILE =
  "rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-7";

// Mirrors the dashboard's layout so the page does not jump when data arrives.
export default function DashboardPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className={`${surface.surface} ${surface.glow} h-full w-full overflow-hidden`}
    >
      <div
        className={`${PAGE_GUTTER_CLASS} w-full max-w-[1400px] pb-10 pt-6 md:pb-14`}
      >
        <span className="sr-only">Loading dashboard</span>
        <div className="h-[1.925rem] w-56 max-w-full animate-pulse rounded-full bg-[#ECE9FF]" />
        <div className={`mt-2 h-5 w-56 max-w-full ${PULSE}`} />

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="min-h-[15rem] animate-pulse rounded-3xl bg-[#DCD5FF] md:min-h-[17rem] lg:col-span-7" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
            {STAT_TILE_IDS.map((id) => (
              <div
                key={id}
                className="rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm"
              >
                <div className={`h-8 w-28 ${PULSE}`} />
                <div className="mt-5 h-7 w-24 animate-pulse rounded-xl bg-[#ECE9FF]" />
                <div className={`mt-3 h-3.5 w-36 max-w-full ${PULSE}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className={`${TILE} lg:col-span-8`}>
            <div className="h-6 w-28 animate-pulse rounded-xl bg-[#ECE9FF]" />
            <div className={`mt-2 h-4 w-52 max-w-full ${PULSE}`} />
            <div className="mt-6 space-y-3">
              {PIPELINE_ROW_WIDTHS.map((width) => (
                <div
                  key={width}
                  className="flex h-9 items-center justify-center rounded-full bg-[#F8F7FF] md:h-10"
                >
                  <div
                    className="h-full animate-pulse rounded-full bg-[#ECE9FF]"
                    style={{ width }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className={`${TILE} lg:col-span-4`}>
            <div className="h-6 w-40 animate-pulse rounded-xl bg-[#ECE9FF]" />
            <div className={`mt-2 h-4 w-44 max-w-full ${PULSE}`} />
            <div className="mt-6 space-y-5">
              {OFF_FUNNEL_ROW_IDS.map((id) => (
                <div key={id} className="flex items-center justify-between">
                  <div className={`h-4 w-28 ${PULSE}`} />
                  <div className={`h-5 w-10 ${PULSE}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {PAYMENT_TILE_IDS.map((id) => (
            <div
              key={id}
              className="h-40 animate-pulse rounded-3xl bg-[#F8F7FF]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
