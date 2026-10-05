import { StatusIcon } from "@/components/icons/StatusIcon";
import {
  buildStatusPillStyle,
  DEFAULT_STATUS_TAGS,
  findStatusTagByName,
  getStatusBadgeClass,
} from "@/lib/status/config";
import type { StatusType } from "@/types/status";
import type { TagRow } from "@/types/tags";

interface StatusBadgeProps {
  status: StatusType;
  statusOptions?: TagRow[];
}

const BADGE_CLASS =
  "inline-flex h-7 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold";

export default function StatusBadge({
  status,
  statusOptions,
}: StatusBadgeProps) {
  const statusMeta =
    findStatusTagByName(statusOptions ?? [], status) ??
    findStatusTagByName(DEFAULT_STATUS_TAGS, status);

  if (!statusMeta) {
    return (
      <span className={`${BADGE_CLASS} ${getStatusBadgeClass(status)}`}>
        <StatusIcon status={status} className="h-3.5 w-3.5 text-white" />
        {status}
      </span>
    );
  }

  return (
    <span
      className={`${BADGE_CLASS} border`}
      style={buildStatusPillStyle(statusMeta.colorHex)}
    >
      <StatusIcon
        status={status}
        iconPack={statusMeta.iconPack}
        iconName={statusMeta.iconName}
        className="h-3.5 w-3.5"
      />
      {status}
    </span>
  );
}
