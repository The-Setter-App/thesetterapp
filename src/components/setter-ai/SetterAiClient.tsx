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
  const [chatSessions, setChatSessions] = useState<ClientChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialChatId,
  );
  const activeSessionIdRef = useRef<string | null>(initialChatId);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const activeMessageLoadRef = useRef(0);
  const bootstrapRanRef = useRef(false);
  const creatingInitialSessionRef = useRef(false);
  const chatSessionsRef = useRef<ClientChatSession[]>([]);
  const sessionSyncPromisesRef = useRef<Map<string, Promise<string | null>>>(
    new Map(),
  );
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());

  const activeSession = useMemo(
    () =>
      chatSessions.find((session) => session.id === activeSessionId) ||
      chatSessions[0] ||
      null,
    [activeSessionId, chatSessions],
  );

  useEffect(() => {
    chatSessionsRef.current = chatSessions;
  }, [chatSessions]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

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
          const currentActiveId = activeSessionIdRef.current;
          if (
            !currentActiveId ||
            !filteredCachedSessions.some(
              (session) => session.id === currentActiveId,
            )
          ) {
            setActiveSessionId(filteredCachedSessions[0].id);
          }
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

      const hasCurrentActiveSession = Boolean(
        activeSessionIdRef.current &&
          mergedSessions.some(
            (session) => session.id === activeSessionIdRef.current,
          ),
      );

      if (hasCurrentActiveSession) {
        // Keep active session stable when local drafts are still syncing.
      } else if (mergedSessions.length > 0) {
        const fallbackId = mergedSessions[0].id;
        setActiveSessionId(fallbackId);
        if (
          pathname === "/setter-ai" &&
          typeof window !== "undefined" &&
          window.location.pathname === "/setter-ai"
        ) {
          updateChatUrl(fallbackId, "replace");
        }
      } else {
        setActiveSessionId(null);
      }

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
      pathname,
      updateChatUrl,
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
      if (isLocalSessionId(sessionId)) return;
      const forceNetwork = Boolean(options?.forceNetwork);
      const fromSelect = Boolean(options?.fromSelect);
      const loadToken = fromSelect
        ? ++activeMessageLoadRef.current
        : activeMessageLoadRef.current;

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

      applySessionMessages(sessionId, serverMessages);
      await setCachedSetterAiMessages(currentEmail, sessionId, serverMessages);
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
            if (
              initialChatId &&
              filteredCachedSessions.some((s) => s.id === initialChatId)
            ) {
              setActiveSessionId(initialChatId);
            } else {
              setActiveSessionId(filteredCachedSessions[0].id);
            }
            setIsBootLoading(false);
          }
        }
      } finally {
        if (!cancelled) {
          const refreshedSessions = await refreshSessions(false).catch(
            () => null,
          );
          const hasSessions = Boolean(
            refreshedSessions && refreshedSessions.length > 0,
          );
          if (!hasSessions && !creatingInitialSessionRef.current) {
            creatingInitialSessionRef.current = true;
            const created = await ensureSessionExists().catch(() => null);
            creatingInitialSessionRef.current = false;
            if (created) {
              setChatSessions([{ ...created, messages: [] }]);
              setActiveSessionId(created.id);
              if (pathname === "/setter-ai") {
                updateChatUrl(created.id, "replace");
              }
            }
          }

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
    ensureSessionExists,
    hydrateDeletedSessionTombstones,
    initialChatId,
    pathname,
    refreshSessions,
    updateChatUrl,
  ]);

  useEffect(() => {
    if (!activeSessionId || !currentEmail) return;
    loadSessionMessages(activeSessionId, { fromSelect: true }).catch(
      () => null,
    );
  }, [activeSessionId, currentEmail, loadSessionMessages]);

  useEffect(() => {
    if (!currentEmail) return;
    for (const session of chatSessions) {
      if (!session.localOnly) continue;
      if (deletedSessionIdsRef.current.has(session.id)) continue;
      void syncLocalSessionToServer(session.id);
    }
  }, [chatSessions, currentEmail, syncLocalSessionToServer]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText || input).trim();
      if (!textToSend || isStreaming || !activeSession || !currentEmail) return;

      const syncedSessionId = await syncLocalSessionToServer(activeSession.id);
      if (!syncedSessionId) {
        return;
      }
      const sessionId = syncedSessionId;
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
        activeSession.messages.filter((message) => message.role === "user")
          .length === 0;
      const optimisticTitle = isFirstUserMessage
        ? textToSend.slice(0, 30) + (textToSend.length > 30 ? "..." : "")
        : activeSession.title;
      const optimisticMessages = [
        ...activeSession.messages,
        optimisticUserMessage,
        optimisticAiMessage,
      ];

      setChatSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title: optimisticTitle || session.title,
                messages: optimisticMessages,
              }
            : session,
        ),
      );
      await setCachedSetterAiMessages(
        currentEmail,
        sessionId,
        optimisticMessages,
      );

      if (!overrideText) setInput("");
      setIsStreaming(true);

      try {
        const response = await fetch("/api/setter-ai/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message: textToSend,
            requestId,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Failed to stream AI response.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

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

        await loadSessionMessages(sessionId, { forceNetwork: true });
        await refreshSessions(true);
      } catch {
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
                    text: STREAM_FAILURE_MESSAGE,
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
            return { ...message, text: STREAM_FAILURE_MESSAGE, pending: false };
          }
          return message;
        });
        await setCachedSetterAiMessages(
          currentEmail,
          sessionId,
          failedMessages,
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [
      activeSession,
      currentEmail,
      input,
      isStreaming,
      loadSessionMessages,
      refreshSessions,
      syncLocalSessionToServer,
    ],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === activeSessionId) return;
      setActiveSessionId(sessionId);
      updateChatUrl(sessionId, "push");
    },
    [activeSessionId, updateChatUrl],
  );

  const handleNewChat = useCallback(async () => {
    if (isStreaming || !currentEmail) return;
    if (activeSession && activeSession.messages.length === 0) return;

    const nowIso = new Date().toISOString();
    const localSessionId = createLocalSessionId();
    const localSession: ClientChatSession = {
      id: localSessionId,
      title: "New Conversation",
      createdAt: nowIso,
      updatedAt: nowIso,
      messages: [],
      localOnly: true,
    };

    setChatSessions((prev) => {
      const next = [localSession, ...prev];
      void setCachedSetterAiSessions(
        currentEmail,
        next.map((item) => ({ ...item, messages: [] })),
      );
      return next;
    });
    setActiveSessionId(localSession.id);
    setSearchTerm("");
    updateChatUrl(localSession.id, "push");

    await setCachedSetterAiMessages(currentEmail, localSession.id, []);
    void syncLocalSessionToServer(localSession.id);
  }, [
    activeSession,
    currentEmail,
    isStreaming,
    syncLocalSessionToServer,
    updateChatUrl,
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

      const nowIso = new Date().toISOString();
      const localSessionId = createLocalSessionId();
      const localSession: ClientChatSession = {
        id: localSessionId,
        title: "New Conversation",
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
        localOnly: true,
      };
      const sessionsWithNew = [localSession, ...nextSessions];
      setChatSessions(sessionsWithNew);
      setActiveSessionId(localSession.id);
      setSearchTerm("");
      await Promise.all([
        setCachedSetterAiSessions(
          currentEmail,
          sessionsWithNew.map((session) => ({ ...session, messages: [] })),
        ),
        setCachedSetterAiMessages(currentEmail, localSession.id, []),
      ]);
      updateChatUrl(localSession.id, "replace");
      void syncLocalSessionToServer(localSession.id);
    },
    [
      activeSessionId,
      chatSessions,
      currentEmail,
      isStreaming,
      markSessionAsDeleted,
      syncLocalSessionToServer,
      unmarkSessionAsDeleted,
      updateChatUrl,
    ],
  );

  const displayedMessages = activeSession?.messages || [];
  const isActiveSessionNewEmpty = Boolean(
    activeSession && activeSession.messages.length === 0,
  );
  const isLoading = isBootLoading || isStreaming;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F8F7FF] text-[#101011] lg:flex-row">
      <ChatSidebar
        sessions={chatSessions}
        activeSessionId={activeSession?.id || activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        disableNewChat={isActiveSessionNewEmpty}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <ChatArea
        messages={displayedMessages}
        isLoading={isLoading}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        searchTerm={searchTerm}
      />
    </div>
  );
}
