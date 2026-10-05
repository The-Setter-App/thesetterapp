import CalendarContentSkeleton from "@/components/calendar/CalendarContentSkeleton";
import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import surface from "@/components/ui/brandSurface.module.css";

export default function CalendarPageSkeleton() {
  return (
    <div
      className={`${surface.surface} flex h-full w-full flex-col overflow-hidden text-[#101011]`}
    >
      <PageHeaderSkeleton
        divider={false}
        titleWidthClass="w-36"
        descriptionWidthClass="w-80"
        titleBadge={
          <div className="h-6 w-16 animate-pulse rounded-full bg-[#F3F0FF]" />
        }
      />

      <div
        className={`${PAGE_GUTTER_CLASS} flex shrink-0 flex-col gap-3 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex items-center gap-2">
          <div className="mr-1 h-7 w-36 animate-pulse rounded-full bg-[#ECE9FF]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-[#F4F5F8]" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-[#F4F5F8]" />
          <div className="h-9 w-16 animate-pulse rounded-full bg-[#F4F5F8]" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-full bg-[#F4F5F8] sm:w-56" />
      </div>

      <CalendarContentSkeleton />
    </div>
  );
}
