import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  titleBadge,
  actions,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 md:py-5 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#101011] md:text-2xl">
              {title}
            </h1>
            {titleBadge}
          </div>
          {description ? (
            <p className="mt-1 text-xs text-[#606266] md:text-sm">
              {description}
            </p>
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
