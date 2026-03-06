import { useCallback } from "react";
import type { Message } from "@/types/inbox";
import { syncOutgoingConversationPreview } from "./useChatPreview";
import type { UseChatSendAudioParams } from "./useChatSendTypes";
import {
  createTempMessageId,
  formatAudioDuration,
  updateChatHistoryWithCache,
} from "./useChatUtils";

export function useChatSendAudio(
  params: UseChatSendAudioParams,
): (blob: Blob, duration: number) => Promise<void> {
  const {
    selectedUserId,
    user,
    setChatHistory,
    pendingTempIdsRef,
    markTempMessagesClientAcked,
  } = params;

  return useCallback(
    async (blob: Blob, duration: number) => {
      if (!user?.id) return;

      const sendDate = new Date();
      const nowIso = sendDate.toISOString();
      const tempId = createTempMessageId("audio");

      const optimisticMessage: Message = {
        id: tempId,
        clientTempId: tempId,
        fromMe: true,
        type: "audio",
        timestamp: nowIso,
        attachmentUrl: URL.createObjectURL(blob),
        duration: formatAudioDuration(duration),
        pending: true,
        clientAcked: false,
      };

      updateChatHistoryWithCache({
        selectedUserId,
        setChatHistory,
        updater: (prev) => [...prev, optimisticMessage],
      });
      pendingTempIdsRef.current.push(tempId);

      const previewTime = sendDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      syncOutgoingConversationPreview({
        selectedUserId,
        previewText: "You sent a voice message",
        previewTime,
        previewUpdatedAt: nowIso,
      });

      try {
        const formData = new FormData();
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `voice_note.${ext}`, {
          type: blob.type,
        });

        formData.append("file", file);
        formData.append("conversationId", user.id);
        formData.append("type", "audio");
        formData.append("clientTempId", tempId);
        formData.append("duration", formatAudioDuration(duration));

        const response = await fetch("/api/send-attachment", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(
            (await response.json()).error || "Failed to send audio",
          );
        }
        markTempMessagesClientAcked([tempId]);
      } catch (error) {
        console.error("Error sending audio:", error);
        setChatHistory((prev) =>
          prev.filter((message) => message.id !== tempId),
        );
        alert("Failed to send voice note");
      }
    },
    [
      markTempMessagesClientAcked,
      pendingTempIdsRef,
      selectedUserId,
      setChatHistory,
      user,
    ],
  );
}
