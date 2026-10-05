import { formatCompactDuration } from "@/lib/inbox/duration";
import type { Message } from "@/types/inbox";

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
  return formatCompactDuration(remainingMs);
}

// Sent back by the send endpoints when Instagram refuses a message because
// the window has closed, so the inbox can explain it instead of offering a
// retry that cannot work.
export const MESSAGING_WINDOW_CLOSED_ERROR_CODE = "messaging_window_closed";

// When the lead last wrote, judged from the messages on screen. More
// dependable than the time stored on the conversation, which older
// conversations do not have. Null when none of the messages are the lead's.
export function getLastInboundAt(
  messages: Array<Pick<Message, "fromMe" | "timestamp" | "pending">>,
): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.fromMe || message.pending || !message.timestamp) continue;
    return message.timestamp;
  }
  return undefined;
}
