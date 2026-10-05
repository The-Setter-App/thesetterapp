import { PAGE_GUTTER_CLASS } from "./pageGutter";

interface PageHeaderSkeletonProps {
  actions?: React.ReactNode;
  titleBadge?: React.ReactNode;
  titleWidthClass?: string;
  descriptionWidthClass?: string;
  // Matches the `divider` option on PageHeader.
  divider?: boolean;
}

// Placeholder with the same spacing as PageHeader, so the page does not shift
// when the real header arrives.
export default function PageHeaderSkeleton({
  actions = null,
  titleBadge = null,
  titleWidthClass = "w-40",
  descriptionWidthClass = "w-72",
  divider = true,
}: PageHeaderSkeletonProps) {
  return (
    <div
      className={`${PAGE_GUTTER_CLASS} bg-white pt-6 ${
        divider ? "border-b border-[#F0F2F6] pb-4" : ""
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className={`h-[1.925rem] max-w-full animate-pulse rounded-full bg-[#ECE9FF] ${titleWidthClass}`}
            />
            {titleBadge}
          </div>
          <div
            className={`mt-2 h-5 max-w-full animate-pulse rounded-full bg-[#F4F5F8] ${descriptionWidthClass}`}
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
