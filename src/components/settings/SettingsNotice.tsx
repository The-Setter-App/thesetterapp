import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type SettingsNoticeTone = "success" | "error" | "warning";

interface SettingsNoticeProps {
  tone: SettingsNoticeTone;
  children: ReactNode;
}

const TONE_STYLES: Record<
  SettingsNoticeTone,
  { className: string; icon: LucideIcon }
> = {
  success: {
    className: "bg-[#F3F0FF] text-[#6d5ed6]",
    icon: CircleCheck,
  },
  error: {
    className: "border border-red-200 bg-red-50 text-red-700",
    icon: CircleAlert,
  },
  warning: {
    className: "border border-amber-200 bg-amber-50 text-amber-800",
    icon: CircleAlert,
  },
};

// The result of an action, shown above the section it belongs to. Errors are
// announced straight away; the others wait their turn.
export default function SettingsNotice({
  tone,
  children,
}: SettingsNoticeProps) {
  const { className, icon: Icon } = TONE_STYLES[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium ${className}`}
    >
      <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
