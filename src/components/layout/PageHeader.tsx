import type { ReactNode } from "react";
import surface from "@/components/ui/brandSurface.module.css";
import { PAGE_GUTTER_CLASS } from "./pageGutter";

interface PageHeaderProps {
  title: string;
  description?: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  // Pins the header to the top of a scrolling page with a hairline under it.
  // Pages whose content sits directly under the title turn this off.
  divider?: boolean;
  className?: string;
}

// The title block at the top of every page in the app. One component so the
// title size, subtitle size, top spacing and left edge are the same
// everywhere.
export default function PageHeader({
  title,
  description,
  titleBadge,
  actions,
  divider = true,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`${surface.surface} ${PAGE_GUTTER_CLASS} pt-6 ${
        divider ? "sticky top-0 z-20 border-b border-[#F0F2F6] pb-4" : ""
      } ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011]">
              {title}
            </h1>
            {titleBadge}
          </div>
          {description ? (
            <p className="mt-2 text-sm text-[#606266]">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
