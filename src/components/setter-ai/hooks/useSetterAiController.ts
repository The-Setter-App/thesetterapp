"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  removeEmptyLocalDraft,
  resolvePreferredSessionId,
  updateBaseChatUrl,
  updateChatUrl,
} from "@/components/setter-ai/hooks/setterAiController/setterAiControllerDraft";
import { bootstrapSessions } from "@/components/setter-ai/hooks/setterAiController/setterAiControllerEffects";
import {
  handleClearLead,
  handleLinkLead,
} from "@/components/setter-ai/hooks/setterAiController/setterAiControllerLead";
import {
  handleSendMessage,
  stopStreaming,
} from "@/components/setter-ai/hooks/setterAiController/setterAiControllerMessaging";
import {
  applySessionMessages,
  hydrateDeletedSessionTombstones,
  loadSessionMessages,
  markSessionAsDeleted,
  persistSessionList,
  refreshSessions,
  unmarkSessionAsDeleted,
} from "@/components/setter-ai/hooks/setterAiController/setterAiControllerSessions";
import {
  getHotCachedSetterAiSessions,
  getHotSetterAiLastEmail,
} from "@/lib/cache";
import {
  handleDeleteSession,
  handleNewChat,
  handleSelectSession,
} from "@/components/setter-ai/hooks/setterAiController/setterAiControllerSidebar";
import { syncLocalSessionToServer } from "@/components/setter-ai/hooks/setterAiController/setterAiControllerSync";
import { getLinkedLead } from "@/components/setter-ai/hooks/setterAiController/setterAiControllerViewModel";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import type { Message } from "@/types/ai";
import type { LeadConversationSummary } from "@/types/setterAiLeadContext";

interface UseSetterAiControllerArgs {
  initialChatId?: string | null;
}

export function useSetterAiController({
  initialChatId = null,
}: UseSetterAiControllerArgs) {
  const pathname = usePathname();
  const prefersDraftStart = initialChatId === null;
  const hotCachedEmail = getHotSetterAiLastEmail();
  const normalizedHotEmail = hotCachedEmail
    ? hotCachedEmail.trim().toLowerCase()
    : null;
  const initialHotSessions = normalizedHotEmail
    ? getHotCachedSetterAiSessions(normalizedHotEmail)
    : null;
  const hasHotSessionData = Boolean(initialHotSessions?.length);
  const [chatSessions, setChatSessions] = useState<ClientChatSession[]>(
    initialHotSessions ?? [],
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialChatId,
  );
  const activeSessionIdRef = useRef<string | null>(initialChatId);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(!hasHotSessionData);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(
    normalizedHotEmail,
  );
  const currentEmailRef = useRef<string | null>(null);
  const activeMessageLoadRef = useRef(0);
  const bootstrapRanRef = useRef(false);
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

  const linkedLead = useMemo(
    () => getLinkedLead(activeSession),
    [activeSession],
  );

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

  const hydrateDeletedSessionTombstonesCb = useCallback(
    async (email: string) => {
      await hydrateDeletedSessionTombstones(email, deletedSessionIdsRef);
    },
    [],
  );

  const markSessionAsDeletedCb = useCallback(
    async (sessionId: string) => {
      await markSessionAsDeleted({
        sessionId,
        currentEmail,
        deletedSessionIdsRef,
      });
    },
    [currentEmail],
  );

  const unmarkSessionAsDeletedCb = useCallback(
    async (sessionId: string) => {
      await unmarkSessionAsDeleted({
        sessionId,
        currentEmail,
        deletedSessionIdsRef,
      });
    },
    [currentEmail],
  );

  const persistSessionListCb = useCallback(
    async (sessions: ClientChatSession[]) => {
      await persistSessionList(currentEmail, sessions);
    },
    [currentEmail],
  );

  const removeEmptyLocalDraftCb = useCallback(
    async (sessionId: string) => {
      await removeEmptyLocalDraft({
        sessionId,
        currentEmail,
        chatSessionsRef,
        setChatSessions,
        persistSessionList: persistSessionListCb,
      });
    },
    [currentEmail, persistSessionListCb],
  );

  const resolvePreferredSessionIdCb = useCallback(
    (sessions: ClientChatSession[]): string | null =>
      resolvePreferredSessionId({
        sessions,
        activeSessionIdRef,
        initialChatId,
        prefersDraftStart,
        pathname,
      }),
    [initialChatId, pathname, prefersDraftStart],
  );

  const applySessionMessagesCb = useCallback(
    (sessionId: string, messages: Message[]) => {
      applySessionMessages({ sessionId, messages, setChatSessions });
    },
    [],
  );

  const refreshSessionsCb = useCallback(
    async (forceNetwork = false): Promise<ClientChatSession[]> =>
      refreshSessions({
        forceNetwork,
        currentEmail,
        deletedSessionIdsRef,
        hydrateDeletedSessionTombstonesFn: hydrateDeletedSessionTombstonesCb,
        resolvePreferredSessionIdFn: resolvePreferredSessionIdCb,
        setCurrentEmail,
        setChatSessions,
        setActiveSessionId,
      }),
    [
      currentEmail,
      hydrateDeletedSessionTombstonesCb,
      resolvePreferredSessionIdCb,
    ],
  );

  const syncLocalSessionToServerCb = useCallback(
    async (localSessionId: string): Promise<string | null> =>
      syncLocalSessionToServer({
        localSessionId,
        currentEmail,
        activeSessionId,
        deletedSessionIdsRef,
        chatSessionsRef,
        sessionSyncPromisesRef,
        setChatSessions,
        setActiveSessionId,
        markSessionAsDeletedFn: markSessionAsDeletedCb,
        updateChatUrlFn: updateChatUrl,
      }),
    [activeSessionId, currentEmail, markSessionAsDeletedCb],
  );

  const loadSessionMessagesCb = useCallback(
    async (
      sessionId: string,
      options?: { forceNetwork?: boolean; fromSelect?: boolean },
    ) => {
      await loadSessionMessages({
        sessionId,
        currentEmail,
        forceNetwork: Boolean(options?.forceNetwork),
        fromSelect: Boolean(options?.fromSelect),
        activeMessageLoadRef,
        chatSessionsRef,
        setIsHistoryLoading,
        applySessionMessagesFn: applySessionMessagesCb,
      });
    },
    [applySessionMessagesCb, currentEmail],
  );

  useEffect(() => {
    if (bootstrapRanRef.current) return;
    bootstrapRanRef.current = true;
    const cancelledRef = { current: false };

    void bootstrapSessions({
      setCurrentEmail,
      setChatSessions,
      setActiveSessionId,
      setIsBootLoading,
      deletedSessionIdsRef,
      hydrateDeletedSessionTombstonesFn: hydrateDeletedSessionTombstonesCb,
      resolvePreferredSessionIdFn: resolvePreferredSessionIdCb,
      refreshSessionsFn: refreshSessionsCb,
      cancelledRef,
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [
    hydrateDeletedSessionTombstonesCb,
    refreshSessionsCb,
    resolvePreferredSessionIdCb,
  ]);

  useEffect(() => {
    if (!activeSessionId || !currentEmail) return;
    loadSessionMessagesCb(activeSessionId, { fromSelect: true }).catch(
      () => null,
    );
  }, [activeSessionId, currentEmail, loadSessionMessagesCb]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      await handleSendMessage({
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
        updateChatUrlFn: updateChatUrl,
        syncLocalSessionToServerFn: syncLocalSessionToServerCb,
        loadSessionMessagesFn: loadSessionMessagesCb,
        refreshSessionsFn: refreshSessionsCb,
      });
    },
    [
      activeSession,
      input,
      isStreaming,
      loadSessionMessagesCb,
      refreshSessionsCb,
      syncLocalSessionToServerCb,
    ],
  );

  const handleLinkLeadCb = useCallback(
    async (lead: LeadConversationSummary) => {
      await handleLinkLead({
        lead,
        currentEmail,
        activeSession,
        isStreaming,
        setChatSessions,
      });
    },
    [activeSession, currentEmail, isStreaming],
  );

  const handleClearLeadCb = useCallback(async () => {
    await handleClearLead({
      currentEmail,
      activeSession,
      isStreaming,
      setChatSessions,
    });
  }, [activeSession, currentEmail, isStreaming]);

  const handleSelectSessionCb = useCallback(
    (sessionId: string) => {
      handleSelectSession({
        sessionId,
        activeSessionId,
        activeSessionIdRef,
        setActiveSessionId,
        updateChatUrlFn: updateChatUrl,
        removeEmptyLocalDraftFn: removeEmptyLocalDraftCb,
      });
    },
    [activeSessionId, removeEmptyLocalDraftCb],
  );

  const handleNewChatCb = useCallback(async () => {
    await handleNewChat({
      isStreaming,
      activeSessionId,
      setActiveSessionId,
      updateBaseChatUrlFn: updateBaseChatUrl,
    });
  }, [activeSessionId, isStreaming]);

  const handleDeleteSessionCb = useCallback(
    async (sessionId: string) => {
      await handleDeleteSession({
        sessionId,
        currentEmail,
        isStreaming,
        chatSessions,
        activeSessionId,
        setChatSessions,
        setActiveSessionId,
        updateChatUrlFn: updateChatUrl,
        updateBaseChatUrlFn: updateBaseChatUrl,
        markSessionAsDeletedFn: markSessionAsDeletedCb,
        unmarkSessionAsDeletedFn: unmarkSessionAsDeletedCb,
        persistSessionListFn: persistSessionListCb,
      });
    },
    [
      activeSessionId,
      chatSessions,
      currentEmail,
      isStreaming,
      markSessionAsDeletedCb,
      persistSessionListCb,
      unmarkSessionAsDeletedCb,
    ],
  );

  const handleStopStreaming = useCallback(() => {
    stopStreaming(streamAbortControllerRef);
  }, []);

  const displayedMessages = activeSession?.messages || [];
  const isLoading = isBootLoading || isStreaming;
  const isSessionListLoading = isBootLoading && chatSessions.length === 0;
  const isChatHistoryLoading =
    (isBootLoading || isHistoryLoading) && displayedMessages.length === 0;

  return {
    sidebar: {
      sessions: chatSessions,
      activeSessionId: activeSession?.id || activeSessionId,
      onSelectSession: handleSelectSessionCb,
      onNewChat: handleNewChatCb,
      onDeleteSession: handleDeleteSessionCb,
      disableNewChat: !activeSessionId,
      isLoading: isSessionListLoading,
      searchTerm,
      setSearchTerm,
    },
    chatArea: {
      messages: displayedMessages,
      isLoading,
      isStreaming,
      isHistoryLoading: isChatHistoryLoading,
      input,
      setInput,
      onSend: handleSend,
      searchTerm,
      linkedLead,
      onLinkLead: handleLinkLeadCb,
      onClearLead: handleClearLeadCb,
      onStopStreaming: handleStopStreaming,
    },
  };
}
