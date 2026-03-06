import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Message, MessagePageResponse, User } from "@/types/inbox";

export interface UseChatSendSharedParams {
  selectedUserId: string;
  user: User | null;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  pendingTempIdsRef: MutableRefObject<string[]>;
}

export interface UseChatSendMessageParams extends UseChatSendSharedParams {
  messageInput: string;
  setMessageInput: Dispatch<SetStateAction<string>>;
  attachmentFile: File | null;
  attachmentPreview: string;
  setAttachmentFile: Dispatch<SetStateAction<File | null>>;
  setAttachmentPreview: Dispatch<SetStateAction<string>>;
  reconcileTimersRef: MutableRefObject<number[]>;
  fetchMessagePage: (
    limit: number,
    cursor?: string,
  ) => Promise<MessagePageResponse>;
  markTempMessagesClientAcked: (tempIds: string[]) => void;
}

export interface UseChatSendAudioParams extends UseChatSendSharedParams {
  markTempMessagesClientAcked: (tempIds: string[]) => void;
}
