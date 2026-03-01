import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import {
  createServerSession,
  streamSetterAiResponse,
} from "@/components/setter-ai/lib/setterAiClientApi";
import { cacheSessionMessages } from "@/components/setter-ai/lib/setterAiClientCacheSync";
import {
  type ClientChatSession,
  FALLBACK_EMPTY_RESPONSE,
  STREAM_FAILURE_MESSAGE,
} from "@/components/setter-ai/lib/setterAiClientConstants";
import type { Message } from "@/types/ai";

export async function handleSendMessage(params: {
  overrideText?: string;
  input: string;
  isStreaming: boolean;
  activeSession: ClientChatSession | null;
  activeSessionIdRef: MutableRefObject<string | null>;
  currentEmailRef: MutableRefObject<string | null>;
  chatSessionsRef: MutableRefObject<ClientChatSession[]>;
  streamAbortControllerRef: MutableRefObject<AbortController | null>;
  setInput: Dispatch<SetStateAction<string>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  updateChatUrlFn: (sessionId: string, mode?: "push" | "replace") => void;
  syncLocalSessionToServerFn: (
    localSessionId: string,
  ) => Promise<string | null>;
  loadSessionMessagesFn: (
    sessionId: string,
    options?: { forceNetwork?: boolean; fromSelect?: boolean },
  ) => Promise<void>;
  refreshSessionsFn: (forceNetwork?: boolean) => Promise<ClientChatSession[]>;
}): Promise<void> {
  const {
    overrideText,
    input,
    isStreaming,
    activeSession,
    activeSessionIdRef,
    currentEmailRef,
    chatSessionsRef,
    streamAbortControllerRef,
    setInput,
    setIsStreaming,
    setChatSessions,
    setActiveSessionId,
    updateChatUrlFn,
    syncLocalSessionToServerFn,
    loadSessionMessagesFn,
    refreshSessionsFn,
  } = params;

  const textToSend = (overrideText || input).trim();
  if (!textToSend || isStreaming) return;
  const email = currentEmailRef.current;
  if (!email) return;

  let targetSession = activeSession;
  if (!targetSession) {
    const created = await createServerSession();
    if (!created) {
      throw new Error("Failed to create chat session.");
    }
    targetSession = { ...created, messages: [] };
    const nextSessions = [targetSession, ...chatSessionsRef.current];
    chatSessionsRef.current = nextSessions;
    setChatSessions(nextSessions);
    setActiveSessionId(created.id);
    activeSessionIdRef.current = created.id;
    updateChatUrlFn(created.id, "replace");
  }
  if (!targetSession) return;

  const targetSessionId = targetSession.id;
  const optimisticUserId = `tmp_user_${Date.now()}`;
  const optimisticAssistantId = `tmp_ai_${Date.now()}`;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const nowIso = new Date().toISOString();

  const optimisticUserMessage: Message = {
    id: optimisticUserId,
    role: "user",
    text: textToSend,
    createdAt: nowIso,
    pending: true,
    clientTempId: optimisticUserId,
  };
  const optimisticAiMessage: Message = {
    id: optimisticAssistantId,
    role: "ai",
    text: "",
    createdAt: nowIso,
    pending: true,
    clientTempId: optimisticAssistantId,
  };

  const isFirstUserMessage =
    targetSession.messages.filter((message) => message.role === "user")
      .length === 0;
  const optimisticTitle = isFirstUserMessage
    ? textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "")
    : targetSession.title;
  const optimisticMessages = [
    ...targetSession.messages,
    optimisticUserMessage,
    optimisticAiMessage,
  ];

  const optimisticSessions = chatSessionsRef.current.map((session) =>
    session.id === targetSessionId
      ? {
          ...session,
          title: optimisticTitle || session.title,
          messages: optimisticMessages,
        }
      : session,
  );
  chatSessionsRef.current = optimisticSessions;
  setChatSessions(optimisticSessions);
  await cacheSessionMessages(email, targetSessionId, optimisticMessages);

  if (!overrideText) setInput("");
  setIsStreaming(true);
  const streamController = new AbortController();
  streamAbortControllerRef.current = streamController;
  let assistantText = "";
  let sessionId = targetSessionId;

  try {
    const syncedSessionId = await syncLocalSessionToServerFn(targetSessionId);
    if (!syncedSessionId) {
      throw new Error("Failed to create chat session.");
    }
    sessionId = syncedSessionId;
    const syncedSession =
      chatSessionsRef.current.find((session) => session.id === sessionId) ||
      null;
    const leadConversationId =
      syncedSession?.linkedInboxConversationId ||
      targetSession.linkedInboxConversationId ||
      null;

    const response = await streamSetterAiResponse({
      sessionId,
      message: textToSend,
      requestId,
      signal: streamController.signal,
      leadConversationId,
    });

    if (!response.ok || !response.body) {
      const raw = await response.text().catch(() => "");
      let message = STREAM_FAILURE_MESSAGE;
      try {
        const parsed = JSON.parse(raw) as {
          error?: string;
          details?: string;
        };
        const core =
          typeof parsed.error === "string" ? parsed.error.trim() : "";
        const details =
          typeof parsed.details === "string" ? parsed.details.trim() : "";
        message = core || STREAM_FAILURE_MESSAGE;
        if (details) {
          message = `${message} (${details.slice(0, 160)})`;
        }
      } catch {
        const fallback = raw.trim();
        if (fallback) {
          message = `${STREAM_FAILURE_MESSAGE} (${fallback.slice(0, 160)})`;
        }
      }
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const token = decoder.decode(value, { stream: true });
      if (!token) continue;

      assistantText += token;
      setChatSessions((prev) =>
        prev.map((session) => {
          if (session.id !== sessionId) return session;
          return {
            ...session,
            messages: session.messages.map((message) =>
              message.id === optimisticAssistantId
                ? { ...message, text: assistantText, pending: true }
                : message,
            ),
          };
        }),
      );
    }

    if (!assistantText.trim()) {
      assistantText = FALLBACK_EMPTY_RESPONSE;
    }

    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: session.messages.map((message) => {
            if (message.id === optimisticUserId)
              return { ...message, pending: false };
            if (message.id === optimisticAssistantId) {
              return { ...message, text: assistantText, pending: false };
            }
            return message;
          }),
        };
      }),
    );

    void loadSessionMessagesFn(sessionId, { forceNetwork: true });
    void refreshSessionsFn(true);
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");
    const abortedMessage = assistantText.trim()
      ? assistantText
      : "Generation stopped.";
    const errorMessage =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : STREAM_FAILURE_MESSAGE;
    setChatSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: session.messages.map((message) => {
            if (message.id === optimisticUserId)
              return { ...message, pending: false };
            if (message.id === optimisticAssistantId) {
              return {
                ...message,
                text: aborted ? abortedMessage : errorMessage,
                pending: false,
              };
            }
            return message;
          }),
        };
      }),
    );
    const failedMessages = optimisticMessages.map((message) => {
      if (message.id === optimisticUserId)
        return { ...message, pending: false };
      if (message.id === optimisticAssistantId) {
        return {
          ...message,
          text: aborted ? abortedMessage : errorMessage,
          pending: false,
        };
      }
      return message;
    });
    await cacheSessionMessages(email, sessionId, failedMessages);
  } finally {
    if (streamAbortControllerRef.current === streamController) {
      streamAbortControllerRef.current = null;
    }
    setIsStreaming(false);
  }
}

export function stopStreaming(
  streamAbortControllerRef: MutableRefObject<AbortController | null>,
): void {
  streamAbortControllerRef.current?.abort();
}
