import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Message, MessagePageResponse } from "@/types/inbox";
import {
  INITIAL_PAGE_SIZE,
  STUCK_PENDING_FALLBACK_MS,
} from "./useChatConstants";
import { cacheChatHistory } from "./useChatUtils";

export function scheduleStuckPendingFallback(params: {
  tempIds: string[];
  selectedUserId: string;
  fetchMessagePage: (
    limit: number,
    cursor?: string,
  ) => Promise<MessagePageResponse>;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  pendingTempIdsRef: MutableRefObject<string[]>;
  reconcileTimersRef: MutableRefObject<number[]>;
}): void {
  const {
    tempIds,
    selectedUserId,
    fetchMessagePage,
    setChatHistory,
    pendingTempIdsRef,
    reconcileTimersRef,
  } = params;

  const timer = window.setTimeout(() => {
    const hasPending = tempIds.some((tempId) =>
      pendingTempIdsRef.current.includes(tempId),
    );
    if (!hasPending) return;

    fetchMessagePage(INITIAL_PAGE_SIZE)
      .then((page) => {
        const outgoing = page.messages.filter((message) => message.fromMe);
        if (outgoing.length === 0) return;

        setChatHistory((prev) => {
          let next = prev;
          const usedIds = new Set<string>();
          const matchWindowMs = 2 * 60 * 1000;

          const takeMatch = (temp: Message): Message | null => {
            const tempText = (temp.text || "").trim();
            const tempTs = Date.parse(temp.timestamp || "");
            const candidates = outgoing.filter((candidate) => {
              if (usedIds.has(candidate.id)) return false;
              if (candidate.type !== temp.type) return false;
              if (temp.type === "text" && tempText) {
                return (candidate.text || "").trim() === tempText;
              }
              const candidateTs = Date.parse(candidate.timestamp || "");
              if (
                Number.isFinite(tempTs) &&
                Number.isFinite(candidateTs) &&
                Math.abs(candidateTs - tempTs) > matchWindowMs
              ) {
                return false;
              }
              return true;
            });
            const match = candidates[candidates.length - 1];
            if (!match) return null;
            usedIds.add(match.id);
            return match;
          };

          for (const tempId of tempIds) {
            if (!pendingTempIdsRef.current.includes(tempId)) continue;
            const tempMsg = next.find((message) => message.id === tempId);
            if (!tempMsg?.pending) continue;

            const match = takeMatch(tempMsg);
            if (!match) continue;

            const alreadyExists = next.some(
              (message) => message.id === match.id,
            );
            const queueIndex = pendingTempIdsRef.current.indexOf(tempId);
            if (queueIndex !== -1) {
              pendingTempIdsRef.current.splice(queueIndex, 1);
            }

            next = alreadyExists
              ? next
                  .filter((message) => message.id !== tempId)
                  .map((message) => {
                    if (message.id !== match.id) return message;
                    return {
                      ...message,
                      ...match,
                      pending: false,
                      clientAcked: undefined,
                      type: match.type !== "text" ? match.type : message.type,
                      attachmentUrl:
                        match.attachmentUrl || message.attachmentUrl,
                      duration: match.duration || message.duration,
                    };
                  })
              : next.map((message) => {
                  if (message.id !== tempId) return message;
                  return {
                    ...match,
                    pending: false,
                    clientAcked: undefined,
                    type: match.type !== "text" ? match.type : message.type,
                    attachmentUrl: match.attachmentUrl || message.attachmentUrl,
                    duration: match.duration || message.duration,
                  };
                });
          }

          if (next === prev) return prev;
          cacheChatHistory(selectedUserId, next);
          return next;
        });
      })
      .catch((error) =>
        console.error("Failed stuck-pending reconcile fetch:", error),
      );
  }, STUCK_PENDING_FALLBACK_MS);

  reconcileTimersRef.current.push(timer);
}
