"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatArea from "@/components/setter-ai/ChatArea";
import ChatSidebar from "@/components/setter-ai/ChatSidebar";
import {
  clearCachedSetterAiMessages,
  getCachedSetterAiMessages,
  getCachedSetterAiMessagesTimestamp,
  getCachedSetterAiSessions,
  getCachedSetterAiSessionsTimestamp,
  getDeletedSetterAiSessionIds,
  getSetterAiLastEmail,
  markDeletedSetterAiSessionId,
  replaceCachedSetterAiSessionId,
  setCachedSetterAiMessages,
  setCachedSetterAiSessions,
  setSetterAiLastEmail,
  unmarkDeletedSetterAiSessionId,
} from "@/lib/setterAiCache";
import type { ChatSession, Message } from "@/types/ai";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

const CACHE_TTL_MS = 60 * 1000;
const FALLBACK_EMPTY_RESPONSE = "No response returned from model.";
const STREAM_FAILURE_MESSAGE =
  "Failed to generate AI response. Please try again.";

type SessionsResponse = {
  sessions: ChatSession[];
  currentEmail: string;
};

type SessionResponse = {
  session: ChatSession;
};

type MessagesResponse = {
  messages: Message[];
};

type ClientChatSession = ChatSession & {
  localOnly?: boolean;
  syncFailed?: boolean;
};

function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true;
  return title.trim().toLowerCase() === "new conversation";
}

function createLocalSessionId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isLocalSessionId(sessionId: string): boolean {
  return sessionId.startsWith("local_");
}

function isEmptyLocalDraft(
  session: ClientChatSession | null | undefined,
): boolean {
  return Boolean(session?.localOnly && (session.messages?.length || 0) === 0);
}

function mergeSessionsWithLocalMessages(
  nextSessions: ChatSession[],
  previous: ClientChatSession[],
): ClientChatSession[] {
  const previousById = new Map(
    previous.map((session) => [session.id, session]),
  );
  const mergedServerSessions = nextSessions.map((session) => {
    const existing = previousById.get(session.id);
    const nextTitle =
      existing &&
      !isPlaceholderTitle(existing.title) &&
      isPlaceholderTitle(session.title)
        ? existing.title
        : session.title;
    return {
      ...session,
      title: nextTitle,
      messages: existing?.messages || [],
    };
  });

  const pendingLocalSessions = previous.filter(
    (session) =>
      session.localOnly &&
      !mergedServerSessions.some((merged) => merged.id === session.id),
  );

  return [...pendingLocalSessions, ...mergedServerSessions];
}

function chatPath(sessionId: string): string {
  return `/setter-ai/${encodeURIComponent(sessionId)}`;
}

interface SetterAiClientProps {
  initialChatId?: string | null;
}

export default function SetterAiClient({
  initialChatId = null,
}: SetterAiClientProps) {
  const pathname = usePathname();
  const prefersDraftStart = initialChatId === null;
  const [chatSessions, setChatSessions] = useState<ClientChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialChatId,
  );
  const activeSessionIdRef = useRef<string | null>(initialChatId);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const currentEmailRef = useRef<string | null>(null);
  const activeMessageLoadRef = useRef(0);
  const bootstrapRanRef = useRef(false);
  const ensuringDraftRef = useRef(false);
  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const chatSessionsRef = useRef<ClientChatSession[]>([]);
  const sessionSyncPromisesRef = useRef<Map<string, Promise<string | null>>>(
    new Map(),
  );
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());

  const activeSession = useMemo(
    () =>
      chatSessions.find((session) => session.id === activeSessionId) || null,
    [activeSessionId, chatSessions],
  );

  const linkedLead = useMemo(() => {
    if (!activeSession?.linkedInboxConversationId) return null;
    const label =
      activeSession.linkedInboxConversationLabel ||
      activeSession.linkedInboxConversationId;
    return {
      conversationId: activeSession.linkedInboxConversationId,
      label,
    };
  }, [
    activeSession?.linkedInboxConversationId,
    activeSession?.linkedInboxConversationLabel,
  ]);

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    currentEmailRef.current = currentEmail;
  }, [currentEmail]);

  useEffect(
    () => () => {
      streamAbortControllerRef.current?.abort();
      streamAbortControllerRef.current = null;
    },
    [],
  );

  const hydrateDeletedSessionTombstones = useCallback(async (email: string) => {
    const deletedSessionIds = await getDeletedSetterAiSessionIds(email);
    deletedSessionIdsRef.current = new Set(deletedSessionIds);
  }, []);

  const markSessionAsDeleted = useCallback(
    async (sessionId: string) => {
      deletedSessionIdsRef.current.add(sessionId);
      if (!currentEmail) return;
      await markDeletedSetterAiSessionId(currentEmail, sessionId);
    },
    [currentEmail],
  );

  const unmarkSessionAsDeleted = useCallback(
    async (sessionId: string) => {
      deletedSessionIdsRef.current.delete(sessionId);
      if (!currentEmail) return;
      await unmarkDeletedSetterAiSessionId(currentEmail, sessionId);
    },
    [currentEmail],
  );

  const updateChatUrl = useCallback(
    (sessionId: string, mode: "push" | "replace" = "push") => {
      if (typeof window === "undefined") return;
      const nextPath = chatPath(sessionId);
      if (window.location.pathname === nextPath) return;
      if (mode === "replace") {
        window.history.replaceState(window.history.state, "", nextPath);
        return;
      }
      window.history.pushState(window.history.state, "", nextPath);
    },
    [],
  );

  const createLocalDraftSession = useCallback((): ClientChatSession => {
    const nowIso = new Date().toISOString();
    return {
      id: createLocalSessionId(),
      title: "New Conversation",
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [],
      localOnly: true,
    };
  }, []);

  const persistSessionList = useCallback(
    async (sessions: ClientChatSession[]) => {
      if (!currentEmail) return;
      await setCachedSetterAiSessions(
        currentEmail,
        sessions.map((session) => ({ ...session, messages: [] })),
      );
    },
    [currentEmail],
  );

  const removeEmptyLocalDraft = useCallback(
    async (sessionId: string) => {
      const session = chatSessionsRef.current.find(
        (item) => item.id === sessionId,
      );
      if (!session || !session.localOnly || session.messages.length > 0) return;

      const nextSessions = chatSessionsRef.current.filter(
        (item) => item.id !== sessionId,
      );
      chatSessionsRef.current = nextSessions;
      setChatSessions(nextSessions);

      if (!currentEmail) return;
      await Promise.all([
        persistSessionList(nextSessions),
        clearCachedSetterAiMessages(currentEmail, sessionId),
      ]);
    },
    [currentEmail, persistSessionList],
  );

  const createAndSelectLocalDraft = useCallback(
    async (options?: {
      mode?: "push" | "replace";
      existingSessions?: ClientChatSession[];
    }): Promise<string | null> => {
      const localSession = createLocalDraftSession();
      const baseSessions = options?.existingSessions ?? chatSessionsRef.current;
      const nextSessions = [localSession, ...baseSessions];

      chatSessionsRef.current = nextSessions;
      setChatSessions(nextSessions);
      setActiveSessionId(localSession.id);
      setSearchTerm("");

      if (currentEmail) {
        await Promise.all([
          persistSessionList(nextSessions),
          setCachedSetterAiMessages(currentEmail, localSession.id, []),
        ]);
      }

      if (options?.mode) {
        updateChatUrl(localSession.id, options.mode);
      }

      return localSession.id;
    },
    [createLocalDraftSession, currentEmail, persistSessionList, updateChatUrl],
  );

  const ensureBasePageDraftSession = useCallback(
    async (mode: "push" | "replace" = "replace"): Promise<string | null> => {
      if (!prefersDraftStart) {
        return null;
      }

      const currentActiveId = activeSessionIdRef.current;
      const currentActive = currentActiveId
        ? chatSessionsRef.current.find(
            (session) => session.id === currentActiveId,
          )
        : null;

      if (isEmptyLocalDraft(currentActive)) {
        if (currentActiveId) {
          updateChatUrl(currentActiveId, mode);
        }
        return currentActiveId;
      }

      const existingEmptyDraft = chatSessionsRef.current.find((session) =>
        isEmptyLocalDraft(session),
      );
      if (existingEmptyDraft) {
        setActiveSessionId(existingEmptyDraft.id);
        updateChatUrl(existingEmptyDraft.id, mode);
        return existingEmptyDraft.id;
      }

      if (ensuringDraftRef.current) {
        return null;
      }

      ensuringDraftRef.current = true;
      try {
        return await createAndSelectLocalDraft({ mode });
      } finally {
        ensuringDraftRef.current = false;
      }
    },
    [createAndSelectLocalDraft, prefersDraftStart, updateChatUrl],
  );

  const resolvePreferredSessionId = useCallback(
    (sessions: ClientChatSession[]): string | null => {
      const currentActiveId = activeSessionIdRef.current;
      if (
        currentActiveId &&
        sessions.some((session) => session.id === currentActiveId)
      ) {
        return currentActiveId;
      }

      if (
        initialChatId &&
        sessions.some((session) => session.id === initialChatId)
      ) {
        return initialChatId;
      }

      if (prefersDraftStart && pathname === "/setter-ai") {
        return null;
      }

      return sessions[0]?.id ?? null;
    },
    [initialChatId, pathname, prefersDraftStart],
  );

  const applySessionMessages = useCallback(
    (sessionId: string, messages: Message[]) => {
      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId ? { ...session, messages } : session,
        ),
      );
    },
    [],
  );

  const fetchSessionsFromServer =
    useCallback(async (): Promise<SessionsResponse> => {
      const response = await fetch("/api/setter-ai/sessions", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load sessions.");
      }
      return response.json();
    }, []);

  const fetchMessagesFromServer = useCallback(
    async (sessionId: string): Promise<Message[]> => {
      const response = await fetch(
        `/api/setter-ai/sessions/${encodeURIComponent(sessionId)}/messages`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to load session messages.");
      }
      const data = (await response.json()) as MessagesResponse;
      return data.messages || [];
    },
    [],
  );

  const refreshSessions = useCallback(
    async (forceNetwork = false): Promise<ClientChatSession[]> => {
      let hadCached = false;
      if (currentEmail) {
        await hydrateDeletedSessionTombstones(currentEmail);
        const tombstonedIds = deletedSessionIdsRef.current;
        const [cachedSessions, cachedAt] = await Promise.all([
          getCachedSetterAiSessions(currentEmail),
          getCachedSetterAiSessionsTimestamp(currentEmail),
        ]);
        const filteredCachedSessions =
          cachedSessions?.filter((session) => !tombstonedIds.has(session.id)) ||
          [];

        if (filteredCachedSessions.length > 0) {
          hadCached = true;
          setChatSessions((prev) =>
            mergeSessionsWithLocalMessages(filteredCachedSessions, prev),
          );
          setActiveSessionId(resolvePreferredSessionId(filteredCachedSessions));
        }

        const cacheIsFresh = Boolean(
          cachedAt && Date.now() - cachedAt < CACHE_TTL_MS,
        );
        if (!forceNetwork && cacheIsFresh && hadCached) {
          return filteredCachedSessions as ClientChatSession[];
        }
      }

      const data = await fetchSessionsFromServer();
      const safeEmail = data.currentEmail.trim().toLowerCase();
      setCurrentEmail(safeEmail);
      await setSetterAiLastEmail(safeEmail);
      await hydrateDeletedSessionTombstones(safeEmail);

      const tombstonedIds = deletedSessionIdsRef.current;
      const nextSessions = (data.sessions || []).filter(
        (session) => !tombstonedIds.has(session.id),
      );
      let mergedSessions: ClientChatSession[] = nextSessions;
      setChatSessions((prev) => {
        mergedSessions = mergeSessionsWithLocalMessages(nextSessions, prev);
        return mergedSessions;
      });

      setActiveSessionId(resolvePreferredSessionId(mergedSessions));

      await setCachedSetterAiSessions(
        safeEmail,
        mergedSessions.map((session) => ({ ...session, messages: [] })),
      );
      return mergedSessions;
    },
    [
      currentEmail,
      fetchSessionsFromServer,
      hydrateDeletedSessionTombstones,
      resolvePreferredSessionId,
    ],
  );

  const ensureSessionExists = useCallback(async () => {
    const response = await fetch("/api/setter-ai/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "New Conversation" }),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as SessionResponse;
    return data.session;
  }, []);

  const syncLocalSessionToServer = useCallback(
    async (localSessionId: string): Promise<string | null> => {
      if (!currentEmail || !isLocalSessionId(localSessionId)) {
        return localSessionId;
      }

      const existingPromise =
        sessionSyncPromisesRef.current.get(localSessionId);
      if (existingPromise) {
        return existingPromise;
      }

      const syncPromise = (async () => {
        if (deletedSessionIdsRef.current.has(localSessionId)) {
          return null;
        }

        const localSession = chatSessionsRef.current.find(
          (session) => session.id === localSessionId,
        );
        if (!localSession) {
          return null;
        }

        const created = await ensureSessionExists().catch(() => null);
        if (!created) {
          if (deletedSessionIdsRef.current.has(localSessionId)) {
            return null;
          }
          setChatSessions((prev) =>
            prev.map((session) =>
              session.id === localSessionId
                ? { ...session, syncFailed: true }
                : session,
            ),
          );
          return null;
        }

        const promotedSession: ClientChatSession = {
          ...created,
          title:
            !isPlaceholderTitle(localSession.title) &&
            isPlaceholderTitle(created.title)
              ? localSession.title
              : created.title,
          messages: localSession.messages,
          linkedInboxConversationId:
            created.linkedInboxConversationId ||
            localSession.linkedInboxConversationId ||
            null,
          linkedInboxConversationLabel:
            created.linkedInboxConversationLabel ||
            localSession.linkedInboxConversationLabel ||
            null,
        };

        if (deletedSessionIdsRef.current.has(localSessionId)) {
          await markSessionAsDeleted(created.id);
          await fetch(
            `/api/setter-ai/sessions/${encodeURIComponent(created.id)}`,
            {
              method: "DELETE",
            },
          ).catch(() => null);
          return null;
        }

        setChatSessions((prev) => {
          const localIndex = prev.findIndex(
            (session) => session.id === localSessionId,
          );
          if (localIndex === -1) {
            if (prev.some((session) => session.id === promotedSession.id)) {
              return prev;
            }
            return [promotedSession, ...prev];
          }

          return prev.map((session, index) =>
            index === localIndex ? promotedSession : session,
          );
        });
        if (activeSessionId === localSessionId) {
          setActiveSessionId(promotedSession.id);
          updateChatUrl(promotedSession.id, "replace");
        }

        await replaceCachedSetterAiSessionId(
          currentEmail,
          localSessionId,
          promotedSession,
        );
        return promotedSession.id;
      })();

      sessionSyncPromisesRef.current.set(localSessionId, syncPromise);
      const resolvedSessionId = await syncPromise;
      sessionSyncPromisesRef.current.delete(localSessionId);
      return resolvedSessionId;
    },
    [
      activeSessionId,
      currentEmail,
      ensureSessionExists,
      markSessionAsDeleted,
      updateChatUrl,
    ],
  );

  const loadSessionMessages = useCallback(
    async (
      sessionId: string,
      options?: { forceNetwork?: boolean; fromSelect?: boolean },
    ) => {
      if (!sessionId || !currentEmail) return;
      const forceNetwork = Boolean(options?.forceNetwork);
      const fromSelect = Boolean(options?.fromSelect);
      const loadToken = fromSelect
        ? ++activeMessageLoadRef.current
        : activeMessageLoadRef.current;
      if (fromSelect) {
        setIsHistoryLoading(true);
      }
      if (isLocalSessionId(sessionId)) {
        if (fromSelect && loadToken === activeMessageLoadRef.current) {
          setIsHistoryLoading(false);
        }
        return;
      }

      try {
        if (!forceNetwork) {
          const [cachedMessages, cachedAt] = await Promise.all([
            getCachedSetterAiMessages(currentEmail, sessionId),
            getCachedSetterAiMessagesTimestamp(currentEmail, sessionId),
          ]);
          if (cachedMessages) {
            applySessionMessages(sessionId, cachedMessages);
            const isFresh = Boolean(
              cachedAt && Date.now() - cachedAt < CACHE_TTL_MS,
            );
            if (isFresh) return;
          }
        }

        const serverMessages = await fetchMessagesFromServer(sessionId);
        if (fromSelect && loadToken !== activeMessageLoadRef.current) {
          return;
        }

        const localSession = chatSessionsRef.current.find(
          (session) => session.id === sessionId,
        );
        const localMessageCount = localSession?.messages.length || 0;
        if (serverMessages.length < localMessageCount) {
          await setCachedSetterAiMessages(
            currentEmail,
            sessionId,
            localSession?.messages || [],
          );
          return;
        }

        applySessionMessages(sessionId, serverMessages);
        await setCachedSetterAiMessages(
          currentEmail,
          sessionId,
          serverMessages,
        );
      } finally {
        if (fromSelect && loadToken === activeMessageLoadRef.current) {
          setIsHistoryLoading(false);
        }
      }
    },
    [applySessionMessages, currentEmail, fetchMessagesFromServer],
  );

  useEffect(() => {
    if (bootstrapRanRef.current) return;
    bootstrapRanRef.current = true;
    let cancelled = false;

    async function bootstrap() {
      let hydratedFromCache = false;
      try {
        const cachedEmail = await getSetterAiLastEmail();
        if (!cancelled && cachedEmail) {
          const normalized = cachedEmail.trim().toLowerCase();
          setCurrentEmail(normalized);
          await hydrateDeletedSessionTombstones(normalized);
          const cachedSessions = await getCachedSetterAiSessions(normalized);
          const tombstonedIds = deletedSessionIdsRef.current;
          const filteredCachedSessions =
            cachedSessions?.filter(
              (session) => !tombstonedIds.has(session.id),
            ) || [];
          if (filteredCachedSessions.length > 0) {
            hydratedFromCache = true;
            setChatSessions(filteredCachedSessions);
            setActiveSessionId(
              resolvePreferredSessionId(filteredCachedSessions),
            );
            setIsBootLoading(false);
          }
        }
      } finally {
        if (!cancelled) {
          await refreshSessions(false).catch(() => null);

          if (!hydratedFromCache) {
            setIsBootLoading(false);
          }
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    hydrateDeletedSessionTombstones,
    refreshSessions,
    resolvePreferredSessionId,
  ]);

  useEffect(() => {
    if (pathname !== "/setter-ai") return;
    if (!prefersDraftStart) return;
    if (isBootLoading) return;

    void ensureBasePageDraftSession("replace");
  }, [ensureBasePageDraftSession, isBootLoading, pathname, prefersDraftStart]);

  useEffect(() => {
    if (!activeSessionId || !currentEmail) return;
    loadSessionMessages(activeSessionId, { fromSelect: true }).catch(
      () => null,
    );
  }, [activeSessionId, currentEmail, loadSessionMessages]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText || input).trim();
      if (!textToSend || isStreaming) return;

      let targetSession = activeSession;
      if (!targetSession) {
        await ensureBasePageDraftSession("replace");
        targetSession =
          chatSessionsRef.current.find(
            (session) => session.id === activeSessionIdRef.current,
          ) || null;
      }

      const email = currentEmailRef.current;
      if (!targetSession || !email) return;

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
      await setCachedSetterAiMessages(
        email,
        targetSessionId,
        optimisticMessages,
      );

      if (!overrideText) setInput("");
      setIsStreaming(true);
      const streamController = new AbortController();
      streamAbortControllerRef.current = streamController;
      let assistantText = "";
      let sessionId = targetSessionId;

      try {
        const syncedSessionId = await syncLocalSessionToServer(targetSessionId);
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

        const response = await fetch("/api/setter-ai/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: streamController.signal,
          body: JSON.stringify({
            sessionId,
            message: textToSend,
            requestId,
            ...(leadConversationId ? { leadConversationId } : {}),
          }),
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
                if (message.id === optimisticAssistantId)
                  return { ...message, text: assistantText, pending: false };
                return message;
              }),
            };
          }),
        );

        void loadSessionMessages(sessionId, { forceNetwork: true });
        void refreshSessions(true);
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
        await setCachedSetterAiMessages(email, sessionId, failedMessages);
      } finally {
        if (streamAbortControllerRef.current === streamController) {
          streamAbortControllerRef.current = null;
        }
        setIsStreaming(false);
      }
    },
    [
      activeSession,
      ensureBasePageDraftSession,
      input,
      isStreaming,
      loadSessionMessages,
      refreshSessions,
      syncLocalSessionToServer,
    ],
  );

  const handleLinkLead = useCallback(
    async (lead: LeadConversationSummary) => {
      if (!currentEmail || !activeSession || isStreaming) return;

      const sessionId = activeSession.id;
      const label = lead.name.replace(/^@/, "") || lead.conversationId;

      setChatSessions((prev) => {
        const next = prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                linkedInboxConversationId: lead.conversationId,
                linkedInboxConversationLabel: label,
              }
            : session,
        );
        void setCachedSetterAiSessions(
          currentEmail,
          next.map((session) => ({ ...session, messages: [] })),
        );
        return next;
      });

      if (isLocalSessionId(sessionId)) {
        return;
      }

      try {
        const res = await fetch(
          `/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              linkedInboxConversationId: lead.conversationId,
              linkedInboxConversationLabel: label,
            }),
          },
        );
        if (!res.ok) {
          throw new Error("Failed to persist linked lead.");
        }
      } catch {
        // Keep optimistic local state even if persistence fails.
      }
    },
    [activeSession, currentEmail, isStreaming],
  );

  const handleClearLead = useCallback(async () => {
    if (!currentEmail || !activeSession || isStreaming) return;

    const sessionId = activeSession.id;

    setChatSessions((prev) => {
      const next = prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              linkedInboxConversationId: null,
              linkedInboxConversationLabel: null,
            }
          : session,
      );
      void setCachedSetterAiSessions(
        currentEmail,
        next.map((session) => ({ ...session, messages: [] })),
      );
      return next;
    });

    if (isLocalSessionId(sessionId)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkedInboxConversationId: null,
            linkedInboxConversationLabel: null,
          }),
        },
      );
      if (!res.ok) {
        throw new Error("Failed to clear linked lead.");
      }
    } catch {
      // Keep optimistic local state even if persistence fails.
    }
  }, [activeSession, currentEmail, isStreaming]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      const previousActiveId = activeSessionIdRef.current;
      setActiveSessionId(sessionId);
      updateChatUrl(sessionId, "push");
      if (previousActiveId) {
        void removeEmptyLocalDraft(previousActiveId);
      }
    },
    [activeSessionId, removeEmptyLocalDraft, updateChatUrl],
  );

  const handleNewChat = useCallback(async () => {
    if (isStreaming) return;
    if (isEmptyLocalDraft(activeSession)) return;
    if (prefersDraftStart) {
      await ensureBasePageDraftSession("push");
      return;
    }
    await createAndSelectLocalDraft({ mode: "push" });
  }, [
    activeSession,
    createAndSelectLocalDraft,
    ensureBasePageDraftSession,
    isStreaming,
    prefersDraftStart,
  ]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!currentEmail || isStreaming) return;
      const sessionToDelete = chatSessions.find(
        (session) => session.id === sessionId,
      );
      if (!sessionToDelete) return;

      const isDeletingActiveSession = activeSessionId === sessionId;
      await markSessionAsDeleted(sessionId);

      const nextSessions = chatSessions.filter(
        (session) => session.id !== sessionId,
      );
      setChatSessions(nextSessions);

      await Promise.all([
        setCachedSetterAiSessions(
          currentEmail,
          nextSessions.map((session) => ({ ...session, messages: [] })),
        ),
        clearCachedSetterAiMessages(currentEmail, sessionId),
      ]);

      if (!isLocalSessionId(sessionId)) {
        void (async () => {
          const response = await fetch(
            `/api/setter-ai/sessions/${encodeURIComponent(sessionId)}`,
            {
              method: "DELETE",
            },
          ).catch(() => null);

          if (response?.ok) {
            return;
          }

          await unmarkSessionAsDeleted(sessionId);
          setChatSessions((prev) => {
            if (prev.some((session) => session.id === sessionToDelete.id)) {
              return prev;
            }
            const restored = [sessionToDelete, ...prev];
            void setCachedSetterAiSessions(
              currentEmail,
              restored.map((session) => ({ ...session, messages: [] })),
            );
            return restored;
          });
        })();
      }

      if (!isDeletingActiveSession) {
        return;
      }

      await createAndSelectLocalDraft({
        mode: "replace",
        existingSessions: nextSessions,
      });
    },
    [
      activeSessionId,
      chatSessions,
      createAndSelectLocalDraft,
      currentEmail,
      isStreaming,
      markSessionAsDeleted,
      unmarkSessionAsDeleted,
    ],
  );

  const handleStopStreaming = useCallback(() => {
    streamAbortControllerRef.current?.abort();
  }, []);

  const displayedMessages = activeSession?.messages || [];
  const isActiveSessionNewEmpty = Boolean(
    activeSession && activeSession.messages.length === 0,
  );
  const isLoading = isBootLoading || isStreaming;
  const isSessionListLoading = isBootLoading && chatSessions.length === 0;
  const isChatHistoryLoading =
    (isBootLoading || isHistoryLoading) && displayedMessages.length === 0;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011] lg:flex-row">
      <ChatSidebar
        sessions={chatSessions}
        activeSessionId={activeSession?.id || activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        disableNewChat={isActiveSessionNewEmpty}
        isLoading={isSessionListLoading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <ChatArea
        messages={displayedMessages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        isHistoryLoading={isChatHistoryLoading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        searchTerm={searchTerm}
        linkedLead={linkedLead}
        onLinkLead={handleLinkLead}
        onClearLead={handleClearLead}
        onStopStreaming={handleStopStreaming}
      />
    </div>
  );
}
