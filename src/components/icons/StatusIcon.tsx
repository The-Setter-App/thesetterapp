import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { getIconComponent } from "@/lib/status/iconRegistry";
import { DEFAULT_STATUS_TAGS, findStatusTagByName } from "@/lib/status/config";
import type { StatusType } from "@/types/status";
import type { TagIconPack } from "@/types/tags";

interface StatusIconProps {
  status?: StatusType;
  iconPack?: TagIconPack;
  iconName?: string;
  className?: string;
  style?: CSSProperties;
}

function resolveStatusIcon({
  status,
  iconPack,
  iconName,
}: Pick<StatusIconProps, "status" | "iconPack" | "iconName">): IconType | null {
  if (iconPack && iconName) {
    const resolved = getIconComponent(iconPack, iconName);
    if (resolved) return resolved;
  }

  if (typeof status === "string" && status.trim().length > 0) {
    const matched = findStatusTagByName(DEFAULT_STATUS_TAGS, status);
    if (matched) {
      const resolved = getIconComponent(matched.iconPack, matched.iconName);
      if (resolved) return resolved;
    }
  }

  return getIconComponent("lu", "LuTag");
}

export function StatusIcon({
  status,
  iconPack,
  iconName,
  className,
  style,
}: StatusIconProps) {
  const Icon = resolveStatusIcon({ status, iconPack, iconName });
  if (!Icon) return null;
  return (
    <Icon
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    />
  );
}
