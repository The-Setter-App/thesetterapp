import type { ChatSession, Message } from "@/types/ai";

export const CACHE_TTL_MS = 60 * 1000;
export const FALLBACK_EMPTY_RESPONSE = "No response returned from model.";
export const STREAM_FAILURE_MESSAGE =
  "Failed to generate AI response. Please try again.";

export type SessionsResponse = {
  sessions: ChatSession[];
  currentEmail: string;
};

export type SessionResponse = {
  session: ChatSession;
};

export type MessagesResponse = {
  messages: Message[];
};

export type ClientChatSession = ChatSession & {
  localOnly?: boolean;
  syncFailed?: boolean;
};
