import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { setCachedConversationDetailsFromRemote } from "@/lib/cache";
import type {
  ConversationDetails,
  Message,
  MessagePageResponse,
  User,
} from "@/types/inbox";
import {
  DETAILS_REFRESH_DELAY_MS,
  INITIAL_PAGE_SIZE,
  SESSION_VALIDATED_CONVERSATIONS,
} from "./useChatConstants";
import {
  fetchChatConversationDetails,
  fetchChatMessagePage,
} from "./useChatConversationApi";
import { hydrateSidebarPreviewFromMessages } from "./useChatPreview";
import {
  cacheChatHistory,
  mergeMessages,
  persistMessagePageMeta,
} from "./useChatUtils";

interface UseChatConversationDataParams {
  selectedUserId: string;
  user: User | null;
  fetchGenRef: MutableRefObject<number>;
  nextCursorRef: MutableRefObject<string | null>;
  detailsRefreshTimerRef: MutableRefObject<number | null>;
  revalidateInFlightRef: MutableRefObject<boolean>;
  setChatHistory: Dispatch<SetStateAction<Message[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingOlder: Dispatch<SetStateAction<boolean>>;
  setHasMoreMessages: Dispatch<SetStateAction<boolean>>;
  setConversationDetails: Dispatch<SetStateAction<ConversationDetails | null>>;
  setConversationDetailsSyncedAt: Dispatch<SetStateAction<number>>;
}

interface UseChatConversationDataResult {
  fetchMessagePage: (
    limit: number,
    cursor?: string,
  ) => Promise<MessagePageResponse>;
  applyConversationSnapshot: (
    messages: Message[] | null,
    details: ConversationDetails | null,
    messageMeta: {
      nextCursor: string | null;
      hasMore: boolean;
      fetchedAt: number;
    } | null,
  ) => boolean;
  refreshConversationDetails: (expectedGen?: number) => Promise<void>;
  refreshLatestMessages: (expectedGen?: number) => Promise<void>;
  scheduleConversationDetailsRefresh: () => void;
  revalidateConversationSnapshot: () => void;
}

export function useChatConversationData(
  params: UseChatConversationDataParams,
): UseChatConversationDataResult {
  const {
    selectedUserId,
    user,
    fetchGenRef,
    nextCursorRef,
    detailsRefreshTimerRef,
    revalidateInFlightRef,
    setChatHistory,
    setLoading,
    setLoadingOlder,
    setHasMoreMessages,
    setConversationDetails,
    setConversationDetailsSyncedAt,
  } = params;
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchMessagePage = useCallback(
    async (limit: number, cursor?: string): Promise<MessagePageResponse> =>
      fetchChatMessagePage({ selectedUserId, limit, cursor }),
    [selectedUserId],
  );

  const fetchConversationDetails = useCallback(
    async (): Promise<ConversationDetails | null> =>
      fetchChatConversationDetails(selectedUserId),
    [selectedUserId],
  );

  const applyConversationSnapshot = useCallback(
    (
      messages: Message[] | null,
      details: ConversationDetails | null,
      messageMeta: {
        nextCursor: string | null;
        hasMore: boolean;
        fetchedAt: number;
      } | null,
    ): boolean => {
      const hasCachedMessages = Boolean(messages && messages.length > 0);
      setLoading(!hasCachedMessages);
      setLoadingOlder(false);
      setHasMoreMessages(messageMeta ? Boolean(messageMeta.hasMore) : true);
      nextCursorRef.current = messageMeta?.nextCursor ?? null;

      if (hasCachedMessages && messages) {
        setChatHistory(messages.slice(-INITIAL_PAGE_SIZE));
      } else {
        setChatHistory([]);
      }

      if (details) {
        setConversationDetails(details);
        setConversationDetailsSyncedAt(Date.now());
      } else {
        setConversationDetails(null);
        setConversationDetailsSyncedAt(0);
      }

      return hasCachedMessages;
    },
    [
      nextCursorRef,
      setChatHistory,
      setConversationDetails,
      setConversationDetailsSyncedAt,
      setHasMoreMessages,
      setLoading,
      setLoadingOlder,
    ],
  );

  const applyLatestMessagePage = useCallback(
    (page: MessagePageResponse): void => {
      setChatHistory((prev) => {
        const merged = mergeMessages(page.messages, prev);
        cacheChatHistory(selectedUserId, merged);
        persistMessagePageMeta({
          selectedUserId,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          fetchedAt: Date.now(),
        });
        hydrateSidebarPreviewFromMessages({
          selectedUserId,
          messages: merged,
          user: userRef.current,
        }).catch((error) => console.error("Preview hydration failed:", error));
        return merged;
      });

      nextCursorRef.current = page.nextCursor;
      setHasMoreMessages(page.hasMore);
      SESSION_VALIDATED_CONVERSATIONS.add(selectedUserId);
    },
    [nextCursorRef, selectedUserId, setChatHistory, setHasMoreMessages],
  );

  const refreshLatestMessages = useCallback(
    async (expectedGen?: number): Promise<void> => {
      const page = await fetchMessagePage(INITIAL_PAGE_SIZE);
      if (
        typeof expectedGen === "number" &&
        expectedGen !== fetchGenRef.current
      ) {
        return;
      }

      applyLatestMessagePage(page);
    },
    [applyLatestMessagePage, fetchGenRef, fetchMessagePage],
  );

  const refreshConversationDetails = useCallback(
    async (expectedGen?: number): Promise<void> => {
      try {
        const details = await fetchConversationDetails();
        if (
          typeof expectedGen === "number" &&
          expectedGen !== fetchGenRef.current
        ) {
          return;
        }

        if (!details) {
          setConversationDetails(null);
          setConversationDetailsSyncedAt(0);
          return;
        }

        const nextState = await setCachedConversationDetailsFromRemote(
          selectedUserId,
          details,
        );
        if (
          typeof expectedGen === "number" &&
          expectedGen !== fetchGenRef.current
        ) {
          return;
        }

        setConversationDetails(nextState.details);
        setConversationDetailsSyncedAt(Date.now());
      } catch (error) {
        console.error("Error loading conversation details:", error);
      }
    },
    [
      fetchConversationDetails,
      fetchGenRef,
      selectedUserId,
      setConversationDetails,
      setConversationDetailsSyncedAt,
    ],
  );

  const scheduleConversationDetailsRefresh = useCallback(() => {
    if (detailsRefreshTimerRef.current) {
      window.clearTimeout(detailsRefreshTimerRef.current);
    }
    detailsRefreshTimerRef.current = window.setTimeout(async () => {
      try {
        await refreshConversationDetails();
      } catch (error) {
        console.error("Failed to refresh conversation details:", error);
      }
    }, DETAILS_REFRESH_DELAY_MS);
  }, [detailsRefreshTimerRef, refreshConversationDetails]);

  const revalidateConversationSnapshot = useCallback((): void => {
    if (document.visibilityState === "hidden") return;
    if (revalidateInFlightRef.current) return;

    const expectedGen = fetchGenRef.current;
    revalidateInFlightRef.current = true;

    refreshLatestMessages(expectedGen)
      .then(() => refreshConversationDetails(expectedGen))
      .catch((error) => {
        console.error("Failed to refresh latest conversation data:", error);
      })
      .finally(() => {
        if (expectedGen === fetchGenRef.current) {
          revalidateInFlightRef.current = false;
        }
      });
  }, [
    fetchGenRef,
    refreshConversationDetails,
    refreshLatestMessages,
    revalidateInFlightRef,
  ]);

  return {
    fetchMessagePage,
    applyConversationSnapshot,
    refreshConversationDetails,
    refreshLatestMessages,
    scheduleConversationDetailsRefresh,
    revalidateConversationSnapshot,
  };
}
