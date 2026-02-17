import type { LeadRow } from "@/types/leads";
import type { User } from "@/types/inbox";

function toTitleFromHandle(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return "Unknown";
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function toHandle(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function toUpdatedAtMs(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toRelativeInteracted(updatedAt?: string, fallback?: string): string {
  const updatedMs = toUpdatedAtMs(updatedAt);
  if (!updatedMs) return fallback || "N/A";

  const diffMs = Date.now() - updatedMs;
  if (!Number.isFinite(diffMs) || diffMs < 0) return fallback || "N/A";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds} sec${seconds === 1 ? "" : "s"} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function toCashLabel(amount?: string): string {
  if (!amount?.trim()) return "N/A";
  const numeric = Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function mapInboxUserToLeadRow(user: User): LeadRow {
  const displayName = toTitleFromHandle(user.name);
  const updatedAtMs = toUpdatedAtMs(user.updatedAt);

  return {
    id: user.id,
    name: displayName,
    handle: toHandle(user.name),
    messageCount: typeof user.unread === "number" && user.unread > 0 ? user.unread : undefined,
    status: user.status,
    cash: toCashLabel(user.paymentDetails?.amount),
    assignedTo: "N/A",
    assignedRole: "",
    account: user.accountLabel || user.ownerInstagramUserId || "N/A",
    interacted: toRelativeInteracted(user.updatedAt, user.time),
    avatar: user.avatar,
    updatedAtMs,
  };
}

export function mapInboxUsersToLeadRows(users: User[]): LeadRow[] {
  return users.map(mapInboxUserToLeadRow);
}
