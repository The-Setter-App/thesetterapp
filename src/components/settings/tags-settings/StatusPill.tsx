import { StatusIcon } from "@/components/icons/StatusIcon";
import { buildStatusPillStyle } from "@/lib/status/config";
import type { TagIconPack } from "@/types/tags";

interface StatusPillProps {
  name: string;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
}

// A status as it appears in Inbox and Leads: its icon and name in its color.
export default function StatusPill({
  name,
  colorHex,
  iconPack,
  iconName,
}: StatusPillProps) {
  return (
    <span
      className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold"
      style={buildStatusPillStyle(colorHex)}
    >
      <StatusIcon
        iconPack={iconPack}
        iconName={iconName}
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: colorHex }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
