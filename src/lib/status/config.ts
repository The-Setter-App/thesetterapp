import type { StatusType } from "@/types/status";
import type { TagIconPack, TagRow } from "@/types/tags";

export const MAX_STATUS_NAME_LENGTH = 32;
export const MAX_STATUS_DESCRIPTION_LENGTH = 120;
export const MAX_STATUS_COLOR_HEX_LENGTH = 7;

const DEFAULT_CREATED_AT = "Default";
const DEFAULT_CREATED_BY = "System";

export const DEFAULT_STATUS_TAGS: TagRow[] = [
  {
    id: "status-new-lead",
    name: "New Lead",
    description: "Incoming lead that has not been contacted yet.",
    source: "Default",
    colorHex: "#F472B6",
    iconPack: "lu",
    iconName: "LuUserPlus",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-in-contact",
    name: "In-Contact",
    description: "Lead is actively being engaged by the team.",
    source: "Default",
    colorHex: "#22C55E",
    iconPack: "lu",
    iconName: "LuMessageCircle",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-qualified",
    name: "Qualified",
    description: "Lead matches your qualification criteria.",
    source: "Default",
    colorHex: "#FBBF24",
    iconPack: "fa6",
    iconName: "FaStar",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-unqualified",
    name: "Unqualified",
    description: "Lead does not match your qualification criteria.",
    source: "Default",
    colorHex: "#EF4444",
    iconPack: "lu",
    iconName: "LuUserX",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-retarget",
    name: "Retarget",
    description: "Lead should be revisited in a future follow-up cycle.",
    source: "Default",
    colorHex: "#2C6CD6",
    iconPack: "fa6",
    iconName: "FaArrowsSpin",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-won",
    name: "Won",
    description: "Lead converted successfully.",
    source: "Default",
    colorHex: "#16A34A",
    iconPack: "lu",
    iconName: "LuTrophy",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-no-show",
    name: "No-Show",
    description: "Lead missed the scheduled appointment.",
    source: "Default",
    colorHex: "#FB7185",
    iconPack: "lu",
    iconName: "LuCalendarX2",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
  {
    id: "status-booked",
    name: "Booked",
    description: "Lead has a booked call or session.",
    source: "Default",
    colorHex: "#5B21B6",
    iconPack: "lu",
    iconName: "LuCalendarCheck2",
    createdBy: DEFAULT_CREATED_BY,
    createdAt: DEFAULT_CREATED_AT,
  },
];

export const STATUS_OPTIONS: StatusType[] = DEFAULT_STATUS_TAGS.map(
  (tag) => tag.name,
);

const DEFAULT_STATUS_BADGE_CLASS_MAP: Record<string, string> = {
  Won: "bg-green-600 text-white",
  Unqualified: "bg-red-600 text-white",
  Booked: "bg-[#5b21b6] text-white",
  "New Lead": "bg-[#f472b6] text-white",
  Qualified: "bg-[#fbbf24] text-white",
  "No-Show": "bg-[#fb7185] text-white",
  "In-Contact": "bg-[#22c55e] text-white",
  Retarget: "bg-[#2563eb] text-white",
};

const DEFAULT_STATUS_TEXT_CLASS_MAP: Record<string, string> = {
  "New Lead": "text-[#f472b6]",
  Qualified: "text-[#fbbf24]",
  Booked: "text-[#5b21b6]",
  Retarget: "text-[#2563eb]",
  Unqualified: "text-red-600",
  "No-Show": "text-[#fb7185]",
  Won: "text-green-600",
  "In-Contact": "text-[#22c55e]",
};

const DEFAULT_INBOX_STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  Won: "text-green-600 border-green-200 bg-white",
  Unqualified: "text-red-500 border-red-200 bg-white",
  Booked: "text-purple-600 border-purple-200 bg-white",
  "New Lead": "text-pink-500 border-pink-200 bg-white",
  Qualified: "text-yellow-500 border-yellow-200 bg-white",
  "No-Show": "text-orange-500 border-orange-200 bg-white",
  "In-Contact": "text-green-500 border-green-200 bg-white",
  Retarget: "text-blue-500 border-blue-200 bg-white",
};

export const STATUS_BADGE_CLASS_MAP: Record<string, string> =
  DEFAULT_STATUS_BADGE_CLASS_MAP;
export const STATUS_TEXT_CLASS_MAP: Record<string, string> =
  DEFAULT_STATUS_TEXT_CLASS_MAP;
export const INBOX_STATUS_COLOR_CLASS_MAP: Record<string, string> =
  DEFAULT_INBOX_STATUS_COLOR_CLASS_MAP;

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS_MAP[status] ?? "bg-[#8771FF] text-white";
}

export function getStatusTextClass(status: string): string {
  return STATUS_TEXT_CLASS_MAP[status] ?? "text-[#8771FF]";
}

export function getInboxStatusColorClass(status: string): string {
  return (
    INBOX_STATUS_COLOR_CLASS_MAP[status] ??
    "text-[#8771FF] border-[#D8D2FF] bg-white"
  );
}

export function normalizeStatusText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeStatusKey(value: string): string {
  return normalizeStatusText(value).toLowerCase();
}

export function isStatusType(value: unknown): value is StatusType {
  return typeof value === "string" && normalizeStatusText(value).length > 0;
}

export function isTagIconPack(value: unknown): value is TagIconPack {
  return value === "lu" || value === "fa6";
}

export function normalizeStatusColorHex(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(normalized)) {
    return normalized;
  }
  return "";
}

export interface StatusPillStyleOptions {
  borderAlpha?: number;
  backgroundAlpha?: number;
}

export interface StatusPillStyle {
  color: string;
  borderColor: string;
  backgroundColor: string;
}

export function toStatusColorRgba(hex: string, alpha: number): string {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(135, 113, 255, ${alpha})`;
  }
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function buildStatusPillStyle(
  colorHex: string,
  options: StatusPillStyleOptions = {},
): StatusPillStyle {
  const borderAlpha = options.borderAlpha ?? 0.35;
  const backgroundAlpha = options.backgroundAlpha ?? 0.14;

  return {
    color: colorHex,
    borderColor: toStatusColorRgba(colorHex, borderAlpha),
    backgroundColor: toStatusColorRgba(colorHex, backgroundAlpha),
  };
}

export function isDefaultStatusName(name: string): boolean {
  const normalized = normalizeStatusKey(name);
  return DEFAULT_STATUS_TAGS.some(
    (statusTag) => normalizeStatusKey(statusTag.name) === normalized,
  );
}

export function findStatusTagByName(
  tags: TagRow[],
  statusName: string,
): TagRow | undefined {
  const normalized = normalizeStatusKey(statusName);
  return tags.find((tag) => normalizeStatusKey(tag.name) === normalized);
}
