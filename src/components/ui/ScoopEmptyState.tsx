import Link from "next/link";
import surface from "./brandSurface.module.css";
import SetterScoopMark from "./SetterScoopMark";

interface ScoopEmptyStateAction {
  label: string;
  href: string;
}

interface ScoopEmptyStateProps {
  title: string;
  description: string;
  action?: ScoopEmptyStateAction;
}

// Fills an area that has nothing to show yet, with the scoop character as
// its illustration.
export default function ScoopEmptyState({
  title,
  description,
  action,
}: ScoopEmptyStateProps) {
  return (
    <div
      className={`${surface.glow} flex h-full flex-1 items-center justify-center bg-white px-6`}
    >
      <div
        className={`${surface.materialize} flex max-w-xs flex-col items-center text-center`}
      >
        <SetterScoopMark />
        <h2 className="mt-7 text-balance text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-[#101011]">
          {title}
        </h2>
        <p className="mt-2 text-pretty text-[0.9375rem] leading-[1.45] text-[#606266]">
          {description}
        </p>
        {action && (
          <Link
            href={action.href}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
