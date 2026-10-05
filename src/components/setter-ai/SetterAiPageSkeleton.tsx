import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";
import surface from "@/components/ui/brandSurface.module.css";

const SIDEBAR_ROW_WIDTHS = ["w-40", "w-32", "w-44", "w-28", "w-36", "w-40"];
const MESSAGE_ROWS = [
  { id: "a", mine: true, width: "w-56" },
  { id: "b", mine: false, width: "w-[70%]" },
  { id: "c", mine: true, width: "w-40" },
  { id: "d", mine: false, width: "w-[82%]" },
];

const PULSE = "animate-pulse rounded-full bg-[#F4F5F8]";

// Mirrors the Setter AI page so the layout does not jump when it loads.
export default function SetterAiPageSkeleton() {
  return (
    <div
      aria-busy="true"
      className={`${surface.surface} flex h-full w-full flex-col overflow-hidden text-[#101011]`}
    >
      <span className="sr-only">Loading Setter AI</span>
      <PageHeaderSkeleton
        divider={false}
        titleWidthClass="w-36"
        descriptionWidthClass="w-96"
      />

      <div className="mt-4 flex min-h-0 flex-1 overflow-hidden border-t border-[#F0F2F6]">
        <div className="hidden w-[320px] shrink-0 flex-col border-r border-[#F0F2F6] lg:flex">
          <div className="space-y-2 px-8 pb-3 pt-4">
            <div className="h-11 animate-pulse rounded-full bg-[#F3F0FF]" />
            <div className={`h-11 ${PULSE}`} />
          </div>
          <div className="space-y-1 px-5 pt-5">
            {SIDEBAR_ROW_WIDTHS.map((width, index) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
                key={index}
                className="flex h-11 items-center px-3"
              >
                <div className={`h-3.5 ${width} ${PULSE}`} />
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${surface.glow} flex min-h-0 flex-1 flex-col bg-white`}
        >
          <div className="min-h-0 flex-1 overflow-hidden px-4 md:px-6">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-6">
              {MESSAGE_ROWS.map((row) => (
                <div
                  key={row.id}
                  className={`flex ${row.mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`animate-pulse rounded-[1.25rem] ${row.width} ${
                      row.mine ? "h-10 bg-[#ECE9FF]" : "h-20 bg-[#F4F5F8]"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 pb-6 md:px-6">
            <div className="mx-auto h-[6.25rem] w-full max-w-3xl animate-pulse rounded-[1.75rem] bg-[#F4F5F8]" />
          </div>
        </div>
      </div>
    </div>
  );
}
