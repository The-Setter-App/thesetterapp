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
    const timeDiff = getTimestampMs(b.updatedAt) - getTimestampMs(a.updatedAt);
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
    return getTimestampMs(previousUser.updatedAt) >
      getTimestampMs(incomingUser.updatedAt)
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
