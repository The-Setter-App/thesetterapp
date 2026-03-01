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

export default function StatusBadge({ status, statusOptions }: StatusBadgeProps) {
  const statusMeta =
    findStatusTagByName(statusOptions ?? [], status) ??
    findStatusTagByName(DEFAULT_STATUS_TAGS, status);

  if (!statusMeta) {
    return (
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold shadow-sm ${getStatusBadgeClass(
          status,
        )}`}
      >
        <StatusIcon status={status} className="h-3 w-3 text-white" />
        {status}
      </span>
    );
  }

  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold shadow-sm"
      style={buildStatusPillStyle(statusMeta.colorHex)}
    >
      <StatusIcon
        status={status}
        iconPack={statusMeta.iconPack}
        iconName={statusMeta.iconName}
        className="h-3 w-3"
      />
      {status}
    </span>
  );
}
