import type { ReactNode } from "react";

interface SettingsSectionCardProps {
  title: string;
  description: string;
  badge?: string;
  // Lets other pages link straight to this section.
  id?: string;
  // Sits beside the heading, e.g. a button that adds to the section.
  action?: ReactNode;
  // Lets a menu inside the card open past its edge instead of being cut off.
  allowOverflow?: boolean;
  children: ReactNode;
}

// One topic within a settings tab: a heading with a line of explanation, and
// a card holding its controls.
export default function SettingsSectionCard({
  title,
  description,
  badge,
  id,
  action,
  allowOverflow = false,
  children,
}: SettingsSectionCardProps) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#101011]">
              {title}
            </h2>
            {badge ? (
              <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF]">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#606266]">
            {description}
          </p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        className={`rounded-3xl border border-[#F0F2F6] bg-white shadow-sm ${
          allowOverflow ? "" : "overflow-hidden"
        }`}
      >
        {children}
      </div>
    </section>
  );
}
