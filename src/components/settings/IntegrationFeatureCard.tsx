import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

interface IntegrationFeatureAction {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
}

export default function IntegrationFeatureCard({
  title,
  description,
  status,
  icon: Icon,
  actions,
}: {
  title: string;
  description: string;
  status: string;
  icon: LucideIcon;
  actions: IntegrationFeatureAction[];
}) {
  return (
    <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#101011]">{title}</p>
            <p className="mt-0.5 text-xs text-[#606266]">{description}</p>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="shrink-0 whitespace-nowrap bg-[#F3F0FF] text-[#8771FF]"
        >
          {status}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={
              action.variant === "secondary"
                ? "inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#F3F0FF] px-4 text-sm font-semibold text-[#8771FF] transition-colors hover:bg-[#EBE5FF] md:w-auto"
                : "inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#8771FF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6d5ed6] md:w-auto"
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
