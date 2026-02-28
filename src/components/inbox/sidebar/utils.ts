import type { User } from "@/types/inbox";

export {
  buildRealtimePreviewText,
  mapRealtimePayloadToMessage,
  mergeMessageCacheSnapshots,
} from "@/lib/inbox/realtime/messageMapping";
export { resolveAudioDurationFromUrl } from "@/lib/inbox/realtime/audioDuration";

function getTimestampMs(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function parseClockLabelMs(value?: string): number {
  if (!value) return 0;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return 0;

  const hours12 = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (!Number.isFinite(hours12) || !Number.isFinite(minutes)) return 0;
  if (hours12 < 1 || hours12 > 12 || minutes < 0 || minutes > 59) return 0;

  const hours24 = (hours12 % 12) + (meridiem === "PM" ? 12 : 0);
  const now = new Date();
  const date = new Date(now);
  date.setHours(hours24, minutes, 0, 0);
  return date.getTime();
}

function getUserRecencyMs(user: User): number {
  const updatedAtMs = getTimestampMs(user.updatedAt);
  if (updatedAtMs > 0) return updatedAtMs;

  const clockLabelMs = parseClockLabelMs(user.time);
  if (clockLabelMs > 0) return clockLabelMs;

  return 0;
}

function isRelativeTimeLabel(value?: string): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized === "just now" ||
    normalized === "yesterday" ||
    normalized.endsWith(" min") ||
    normalized.endsWith(" mins") ||
    normalized.endsWith(" hour") ||
    normalized.endsWith(" hours") ||
    normalized.endsWith(" day") ||
    normalized.endsWith(" days")
  );
}

function getStableDisplayTime(
  updatedAt?: string,
  currentLabel?: string,
): string {
  if (!updatedAt) return currentLabel || "";
  const ms = Date.parse(updatedAt);
  if (!Number.isFinite(ms)) return currentLabel || "";
  if (!isRelativeTimeLabel(currentLabel)) return currentLabel || "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeUsersFromBackend(list: User[]): User[] {
  return list.map((user) => ({
    ...user,
    time: getStableDisplayTime(user.updatedAt, user.time),
  }));
}

export function sortUsersByRecency(list: User[]): User[] {
  return [...list].sort((a, b) => {
    const timeDiff = getUserRecencyMs(b) - getUserRecencyMs(a);
    if (timeDiff !== 0) return timeDiff;

    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;

    return b.id.localeCompare(a.id);
  });
}

export function mergeUsersWithLocalRecency(
  previous: User[],
  incoming: User[],
): User[] {
  const previousById = new Map(previous.map((user) => [user.id, user]));
  const merged = incoming.map((incomingUser) => {
    const previousUser = previousById.get(incomingUser.id);
    if (!previousUser) return incomingUser;
    return getUserRecencyMs(previousUser) >
      getUserRecencyMs(incomingUser)
      ? previousUser
      : incomingUser;
  });

  const incomingIds = new Set(incoming.map((user) => user.id));
  for (const previousUser of previous) {
    if (!incomingIds.has(previousUser.id)) {
      merged.push(previousUser);
    }
  }

  return sortUsersByRecency(merged);
}

export function getChangedConversationIds(
  previous: User[],
  nextUsers: User[],
): string[] {
  const previousById = new Map(previous.map((user) => [user.id, user]));
  const changedIds: string[] = [];

  for (const nextUser of nextUsers) {
    const previousUser = previousById.get(nextUser.id);
    if (!previousUser) {
      changedIds.push(nextUser.id);
      continue;
    }

    const hasPreviewChanged =
      previousUser.lastMessage !== nextUser.lastMessage ||
      previousUser.time !== nextUser.time;
    const hasRecencyChanged = previousUser.updatedAt !== nextUser.updatedAt;
    const hasUnreadChanged = (previousUser.unread ?? 0) !== (nextUser.unread ?? 0);

    if (hasPreviewChanged || hasRecencyChanged || hasUnreadChanged) {
      changedIds.push(nextUser.id);
    }
  }

  return changedIds;
}
