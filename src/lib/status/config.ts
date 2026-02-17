import type { StatusType } from "@/types/status";

export const STATUS_OPTIONS: StatusType[] = [
  "New Lead",
  "In-Contact",
  "Qualified",
  "Unqualified",
  "Retarget",
  "Won",
  "No-Show",
  "Booked",
];

export const STATUS_ICON_PATHS: Record<StatusType, string> = {
  Won: "/icons/status/Won.svg",
  Unqualified: "/icons/status/Unqualified.svg",
  Booked: "/icons/status/Booked.svg",
  "New Lead": "/icons/status/NewLead.svg",
  Qualified: "/icons/status/Qualified.svg",
  "No-Show": "/icons/status/NoShow.svg",
  "In-Contact": "/icons/status/InContact.svg",
  Retarget: "/icons/status/Retarget.svg",
};

export const STATUS_COLOR_ICON_PATHS: Record<StatusType, string> = {
  Won: "/icons/status-colors/Won.svg",
  Unqualified: "/icons/status-colors/Unqualified.svg",
  Booked: "/icons/status-colors/Booked.svg",
  "New Lead": "/icons/status-colors/NewLead.svg",
  Qualified: "/icons/status-colors/Qualified.svg",
  "No-Show": "/icons/status-colors/NoShow.svg",
  "In-Contact": "/icons/status-colors/InContact.svg",
  Retarget: "/icons/status-colors/Retarget.svg",
};

export const STATUS_BADGE_CLASS_MAP: Record<StatusType, string> = {
  Won: "bg-green-600 text-white",
  Unqualified: "bg-red-600 text-white",
  Booked: "bg-[#5b21b6] text-white",
  "New Lead": "bg-[#f472b6] text-white",
  Qualified: "bg-[#fbbf24] text-white",
  "No-Show": "bg-[#fb7185] text-white",
  "In-Contact": "bg-[#22c55e] text-white",
  Retarget: "bg-[#2563eb] text-white",
};

export const STATUS_TEXT_CLASS_MAP: Record<StatusType, string> = {
  "New Lead": "text-[#f472b6]",
  Qualified: "text-[#fbbf24]",
  Booked: "text-[#5b21b6]",
  Retarget: "text-[#2563eb]",
  Unqualified: "text-red-600",
  "No-Show": "text-[#fb7185]",
  Won: "text-green-600",
  "In-Contact": "text-[#22c55e]",
};

export function isStatusType(value: unknown): value is StatusType {
  return typeof value === "string" && STATUS_OPTIONS.includes(value as StatusType);
}
