import surface from "@/components/ui/brandSurface.module.css";

const FILTER_PILL_WIDTHS = ["w-28", "w-32", "w-28", "w-32"];
const ROW_IDS = [
  "row-1",
  "row-2",
  "row-3",
  "row-4",
  "row-5",
  "row-6",
  "row-7",
  "row-8",
];
const CELL_WIDTHS = ["w-24", "w-20", "w-16", "w-24", "w-20", "w-16"];

const PULSE = "animate-pulse rounded-full bg-[#F4F5F8]";

// Mirrors the leads page so the layout does not jump when the rows arrive.
export default function LeadsPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className={`${surface.surface} flex h-full w-full flex-col overflow-hidden`}
    >
      <span className="sr-only">Loading leads</span>

      <div className="flex flex-col gap-4 px-4 pb-4 pt-6 md:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <div className="h-7 w-28 animate-pulse rounded-full bg-[#ECE9FF]" />
          <div className={`mt-3 h-4 w-72 max-w-full ${PULSE}`} />
        </div>
        <div className={`h-11 w-full lg:w-[280px] ${PULSE}`} />
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-4 md:px-6 lg:px-8">
        {FILTER_PILL_WIDTHS.map((width, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
            key={index}
            className={`h-10 ${width} ${PULSE}`}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="h-px bg-[#F0F2F6]" />
        {ROW_IDS.map((rowId) => (
          <div
            key={rowId}
            className="flex h-[3.75rem] items-center gap-4 border-b border-[#F0F2F6] px-4 md:px-6 lg:px-8"
          >
            <div className="h-[1.125rem] w-[1.125rem] shrink-0 animate-pulse rounded-md bg-[#F4F5F8]" />
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-[#F3F0FF]" />
            <div className="h-3.5 w-32 shrink-0 animate-pulse rounded-full bg-[#ECE9FF]" />
            <div className="hidden flex-1 items-center justify-between gap-4 md:flex">
              {CELL_WIDTHS.map((width, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
                  key={index}
                  className={`h-3.5 ${width} ${PULSE}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#F0F2F6] px-4 py-3 md:px-6 lg:px-8">
        <div className={`h-4 w-32 ${PULSE}`} />
        <div className={`h-9 w-40 ${PULSE}`} />
      </div>
    </div>
  );
}
