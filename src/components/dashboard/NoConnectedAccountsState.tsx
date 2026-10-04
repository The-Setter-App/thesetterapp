import Link from "next/link";
import surface from "@/components/ui/brandSurface.module.css";
import SetterScoop from "@/components/ui/SetterScoop";

interface NoConnectedAccountsStateProps {
  displayName: string;
}

export default function NoConnectedAccountsState({
  displayName,
}: NoConnectedAccountsStateProps) {
  return (
    <div
      className={`${surface.surface} ${surface.glow} h-full overflow-y-auto`}
    >
      {/* The inner wrapper centres the card and still lets it scroll when the
          panel is shorter than the card. */}
      <div className="flex min-h-full items-center justify-center px-4 py-16 md:px-6">
        <div
          className={`${surface.materialize} relative w-full max-w-md rounded-3xl border border-[#F0F2F6] bg-white p-6 pt-10 text-center shadow-sm md:p-10 md:pt-12`}
        >
          <SetterScoop className="pointer-events-none absolute -top-[3.05rem] left-1/2 h-auto w-28 -translate-x-1/2" />
          <h1 className="text-balance text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011]">
            Hi, {displayName}
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-pretty text-[1.0625rem] leading-[1.45] text-[#606266]">
            Connect your Instagram account in Settings to load live dashboard
            metrics.
          </p>
          <Link
            href="/settings"
            className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#8771FF] px-6 text-base font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] md:w-auto [@media(hover:hover)]:hover:bg-[#6d5ed6]"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
