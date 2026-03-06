interface PageHeaderSkeletonProps {
  actions?: React.ReactNode;
  titleBadge?: React.ReactNode;
  titleWidthClass?: string;
  descriptionWidthClass?: string;
}

export default function PageHeaderSkeleton({
  actions = null,
  titleBadge = null,
  titleWidthClass = "w-40",
  descriptionWidthClass = "w-72",
}: PageHeaderSkeletonProps) {
  return (
    <div className="border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 md:py-5 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`h-8 animate-pulse rounded bg-[#ECE9FF] ${titleWidthClass}`}
            />
            {titleBadge}
          </div>
          <div
            className={`mt-2 h-4 animate-pulse rounded bg-[#F4F5F8] ${descriptionWidthClass}`}
          />
        </div>
        {actions ? (
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
