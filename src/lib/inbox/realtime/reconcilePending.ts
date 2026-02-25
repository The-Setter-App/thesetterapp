import type { Message, SSEMessageData } from "@/types/inbox";
import {
  mapRealtimePayloadToMessage,
  type RealtimeMessageEventType,
} from "@/lib/inbox/realtime/messageMapping";

type ReconcileResult = {
  messages: Message[];
  matchedTempId: string | null;
};

function normalizeText(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function isPendingOutgoing(message: Message): boolean {
  return Boolean(message.pending) && Boolean(message.fromMe);
}

export function reconcilePendingMessages(params: {
  existing: Message[];
  eventType: RealtimeMessageEventType;
  data: SSEMessageData;
  matchWindowMs?: number;
}): ReconcileResult {
  const matchWindowMs = params.matchWindowMs ?? 30_000;
  const canonical = mapRealtimePayloadToMessage(params.eventType, params.data);

  if (params.eventType !== "message_echo" && !params.data.fromMe) {
    return { messages: params.existing, matchedTempId: null };
  }

  const canonicalTimestampMs = params.data.timestamp;
  const canonicalText = normalizeText(canonical.text);

  const pendingCandidates = params.existing.filter(isPendingOutgoing);

  const matched = pendingCandidates.find((candidate) => {
    if (candidate.type !== canonical.type) return false;

    if (canonical.type === "text") {
      return normalizeText(candidate.text) === canonicalText && canonicalText.length > 0;
    }

    const candidateTimestampMs = Date.parse(candidate.timestamp || "");
    if (
      Number.isFinite(candidateTimestampMs) &&
      Number.isFinite(canonicalTimestampMs)
    ) {
      return Math.abs(candidateTimestampMs - canonicalTimestampMs) <= matchWindowMs;
    }

    return true;
  });

  if (!matched) {
    return { messages: params.existing, matchedTempId: null };
  }

  const canonicalAlreadyExists = params.existing.some(
    (message) => message.id === canonical.id,
  );

  const merged: Message = {
    ...matched,
    ...canonical,
    id: canonical.id,
    pending: false,
    attachmentUrl: canonical.attachmentUrl || matched.attachmentUrl,
    duration: canonical.duration || matched.duration,
    text: canonical.text || matched.text,
    timestamp: canonical.timestamp || matched.timestamp,
  };

  if (canonicalAlreadyExists) {
    const next = params.existing
      .filter((message) => message.id !== matched.id)
      .map((message) =>
        message.id === canonical.id ? { ...message, ...merged } : message,
      );
    return { messages: next, matchedTempId: matched.id };
  }

  const next = params.existing.map((message) =>
    message.id === matched.id ? merged : message,
  );
  return { messages: next, matchedTempId: matched.id };
}

