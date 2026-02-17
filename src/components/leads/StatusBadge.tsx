import { STATUS_BADGE_CLASS_MAP, STATUS_ICON_PATHS } from "@/lib/status/config";
import type { StatusType } from "@/types/status";

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const icon = STATUS_ICON_PATHS[status];
  const style = STATUS_BADGE_CLASS_MAP[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold w-fit shadow-sm ${style}`}>
      <img src={icon} alt={status + ' icon'} className="w-3 h-3" />
      {status}
    </span>
  );
}
