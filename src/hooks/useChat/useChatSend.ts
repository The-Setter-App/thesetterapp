import { useChatSendAudio } from "./useChatSendAudio";
import { useChatSendMessage } from "./useChatSendMessage";
import type { UseChatSendMessageParams } from "./useChatSendTypes";

interface UseChatSendResult {
  handleSendMessage: () => Promise<void>;
  handleSendAudio: (blob: Blob, duration: number) => Promise<void>;
}

export function useChatSend(
  params: UseChatSendMessageParams,
): UseChatSendResult {
  const handleSendMessage = useChatSendMessage(params);
  const handleSendAudio = useChatSendAudio({
    selectedUserId: params.selectedUserId,
    user: params.user,
    setChatHistory: params.setChatHistory,
    pendingTempIdsRef: params.pendingTempIdsRef,
    markTempMessagesClientAcked: params.markTempMessagesClientAcked,
  });

  return {
    handleSendMessage,
    handleSendAudio,
  };
}
