import { useCallback } from "react";
import { optimizeImageForUpload } from "@/lib/imageCompression";
import type { Message } from "@/types/inbox";
import { scheduleStuckPendingFallback } from "./useChatPendingFallback";
import { syncOutgoingConversationPreview } from "./useChatPreview";
import type { UseChatSendMessageParams } from "./useChatSendTypes";
import {
  createTempMessageId,
  updateChatHistoryWithCache,
} from "./useChatUtils";

export function useChatSendMessage(
  params: UseChatSendMessageParams,
): () => Promise<void> {
  const {
    selectedUserId,
    user,
    messageInput,
    setMessageInput,
    attachmentFile,
    attachmentPreview,
    setAttachmentFile,
    setAttachmentPreview,
    setChatHistory,
    pendingTempIdsRef,
    reconcileTimersRef,
    fetchMessagePage,
    markTempMessagesClientAcked,
  } = params;

  return useCallback(async () => {
    const hasText = messageInput.trim().length > 0;
    const hasAttachment = !!attachmentFile;
    if ((!hasText && !hasAttachment) || !user?.id) return;

    const messageText = messageInput.trim();
    const currentFile = attachmentFile;
    const currentPreview = attachmentPreview;
    const sendDate = new Date();
    const nowIso = sendDate.toISOString();
    const tempIds: string[] = [];
    const optimisticMessages: Message[] = [];
    let imageTempId: string | null = null;
    let textTempId: string | null = null;

    if (hasAttachment) {
      imageTempId = createTempMessageId("img");
      tempIds.push(imageTempId);
      optimisticMessages.push({
        id: imageTempId,
        clientTempId: imageTempId,
        fromMe: true,
        type: "image",
        text: "",
        timestamp: nowIso,
        attachmentUrl: currentPreview || undefined,
        pending: true,
        clientAcked: false,
      });
    }

    if (hasText) {
      textTempId = createTempMessageId("txt");
      tempIds.push(textTempId);
      optimisticMessages.push({
        id: textTempId,
        clientTempId: textTempId,
        fromMe: true,
        type: "text",
        text: messageText,
        timestamp: nowIso,
        pending: true,
        clientAcked: false,
      });
    }

    updateChatHistoryWithCache({
      selectedUserId,
      setChatHistory,
      updater: (prev) => [...prev, ...optimisticMessages],
    });
    pendingTempIdsRef.current.push(...tempIds);
    setMessageInput("");
    setAttachmentFile(null);
    setAttachmentPreview("");

    const previewTime = sendDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const previewText = messageText || (hasAttachment ? "Image" : "Message");
    syncOutgoingConversationPreview({
      selectedUserId,
      previewText,
      previewTime,
      previewUpdatedAt: nowIso,
    });

    try {
      if (currentFile) {
        let fileForUpload = currentFile;
        if (currentFile.type.startsWith("image/")) {
          try {
            const optimized = await optimizeImageForUpload(currentFile);
            fileForUpload = optimized.file;
            if (optimized.optimized) {
              console.info(
                `[Inbox] Optimized image before upload (${optimized.originalSize} -> ${optimized.optimizedSize} bytes)`,
              );
            }
          } catch (compressionError) {
            console.warn(
              "[Inbox] Image optimization failed, uploading original file.",
              compressionError,
            );
          }
        }

        const formData = new FormData();
        formData.append("file", fileForUpload);
        formData.append("conversationId", user.id);
        formData.append("type", "image");
        if (imageTempId) {
          formData.append("clientTempId", imageTempId);
        }

        const response = await fetch("/api/send-attachment", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(
            (await response.json()).error || "Failed to send attachment",
          );
        }

        if (messageText) {
          const sendRes = await fetch(
            `/api/inbox/conversations/${encodeURIComponent(user.id)}/send`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: messageText,
                clientTempId: textTempId,
              }),
            },
          );
          if (!sendRes.ok) {
            throw new Error(
              (await sendRes.json()).error || "Failed to send message",
            );
          }
        }
      } else {
        const sendRes = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: messageText,
              clientTempId: textTempId,
            }),
          },
        );
        if (!sendRes.ok) {
          throw new Error(
            (await sendRes.json()).error || "Failed to send message",
          );
        }
      }

      markTempMessagesClientAcked(tempIds);
      scheduleStuckPendingFallback({
        tempIds,
        selectedUserId,
        fetchMessagePage,
        setChatHistory,
        pendingTempIdsRef,
        reconcileTimersRef,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      const tempIdSet = new Set(tempIds);
      setChatHistory((prev) =>
        prev.filter((message) => !tempIdSet.has(message.id)),
      );
      setMessageInput(messageText);
      if (currentFile && currentPreview) {
        setAttachmentFile(currentFile);
        setAttachmentPreview(currentPreview);
      }
      alert("Failed to send message");
    }
  }, [
    attachmentFile,
    attachmentPreview,
    fetchMessagePage,
    markTempMessagesClientAcked,
    messageInput,
    pendingTempIdsRef,
    reconcileTimersRef,
    selectedUserId,
    setAttachmentFile,
    setAttachmentPreview,
    setChatHistory,
    setMessageInput,
    user,
  ]);
}
