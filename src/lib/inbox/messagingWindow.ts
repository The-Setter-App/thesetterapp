// Setter tags every outbound reply HUMAN_AGENT (see DEFAULT_MESSAGE_TAG in
// graphApi.ts), which extends Instagram's bare 24-hour reply window to 7
// days for genuine human replies to a specific customer inquiry. Every
// consumer of this window should reflect that real, usable window — not
// the 24-hour default that only applies when no message tag is used.
export const MESSAGING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const MESSAGING_WINDOW_WARNING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type MessagingWindowStatus = "ok" | "urgent" | "closed";

export interface MessagingWindowState {
  status: MessagingWindowStatus;
  remainingMs: number;
}

export function getMessagingWindowState(
  lastInboundAt: string | undefined,
  now: number = Date.now(),
): MessagingWindowState | null {
  if (!lastInboundAt) return null;

  const lastInboundMs = new Date(lastInboundAt).getTime();
  if (!Number.isFinite(lastInboundMs)) return null;

  const remainingMs = lastInboundMs + MESSAGING_WINDOW_MS - now;
  if (remainingMs <= 0) return { status: "closed", remainingMs: 0 };
  if (remainingMs <= MESSAGING_WINDOW_WARNING_THRESHOLD_MS) {
    return { status: "urgent", remainingMs };
  }
  return { status: "ok", remainingMs };
}

export function formatMessagingWindowRemaining(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(remainingMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
