import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useEffect,
} from "react";
import { getInboxUsers } from "@/app/actions/inbox";
import {
  getCachedConversationDetails,
  getCachedMessagePageMeta,
  getCachedMessages,
  getCachedUsers,
  getHotCachedConversationDetails,
  getHotCachedMessagePageMeta,
  getHotCachedMessages,
  getHotCachedUsers,
} from "@/lib/cache";
import {
  INBOX_CONVERSATIONS_REFRESHED_EVENT,
  type InboxConversationsRefreshedDetail,
} from "@/lib/inbox/clientRealtimeEvents";
import type { ConversationDetails, Message, User } from "@/types/inbox";
import {
  PREFETCH_FRESH_MS,
  SESSION_VALIDATED_CONVERSATIONS,
} from "./useChatConstants";

export function useChatUserLoaderEffect(params: {
  selectedUserId: string;
  setUser: Dispatch<SetStateAction<User | null>>;
}): void {
  const { selectedUserId, setUser } = params;

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const hotCachedUsers = getHotCachedUsers();
        const hotFoundUser = hotCachedUsers?.find(
          (cachedUser) => cachedUser.id === selectedUserId,
        );
        if (hotFoundUser) {
          setUser(hotFoundUser);
        }

        const cachedUsers = await getCachedUsers();
        if (cancelled) return;
        const foundUser = cachedUsers?.find(
          (cachedUser) => cachedUser.id === selectedUserId,
        );
        if (foundUser) {
          setUser(foundUser);
          return;
        }

        if (hotFoundUser) return;
        const users = await getInboxUsers();
        if (cancelled) return;
        const target = users.find(
          (cachedUser) => cachedUser.id === selectedUserId,
        );
        if (target) {
          setUser(target);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId, setUser]);
}

export function useChatConversationLoaderEffect(params: {
  selectedUserId: string;
  fetchGenRef: MutableRefObject<number>;
  pendingTempIdsRef: MutableRefObject<string[]>;
  clearReconcileTimers: () => void;
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
  setLoading: Dispatch<SetStateAction<boolean>>;
  setInitialLoadSettled: Dispatch<SetStateAction<boolean>>;
}): void {
  const {
    selectedUserId,
    fetchGenRef,
    pendingTempIdsRef,
    clearReconcileTimers,
    applyConversationSnapshot,
    refreshConversationDetails,
    refreshLatestMessages,
    setLoading,
    setInitialLoadSettled,
  } = params;

  useEffect(() => {
    const gen = ++fetchGenRef.current;

    async function loadMessages() {
      try {
        setInitialLoadSettled(false);
        clearReconcileTimers();

        const hotCachedMessages = getHotCachedMessages(selectedUserId);
        const hotCachedDetails =
          getHotCachedConversationDetails(selectedUserId);
        const hotCachedMessageMeta =
          getHotCachedMessagePageMeta(selectedUserId);
        applyConversationSnapshot(
          hotCachedMessages,
          hotCachedDetails,
          hotCachedMessageMeta,
        );

        const [cachedMessages, cachedDetails, cachedMessageMeta] =
          await Promise.all([
            getCachedMessages(selectedUserId),
            getCachedConversationDetails(selectedUserId),
            getCachedMessagePageMeta(selectedUserId),
          ]);
        if (gen !== fetchGenRef.current) return;

        const resolvedMessages = cachedMessages ?? hotCachedMessages;
        const resolvedDetails = cachedDetails ?? hotCachedDetails;
        const resolvedMessageMeta = cachedMessageMeta ?? hotCachedMessageMeta;
        const hasCachedMessages = applyConversationSnapshot(
          resolvedMessages,
          resolvedDetails,
          resolvedMessageMeta,
        );

        const hasSessionValidation =
          SESSION_VALIDATED_CONVERSATIONS.has(selectedUserId);
        const canSkipMessageFetch =
          hasCachedMessages &&
          Boolean(resolvedMessageMeta) &&
          Date.now() - (resolvedMessageMeta?.fetchedAt ?? 0) <
            PREFETCH_FRESH_MS &&
          hasSessionValidation;
        const shouldBlockForDetails = !resolvedDetails;
        const detailsRefreshPromise = refreshConversationDetails(gen);

        if (canSkipMessageFetch) {
          if (shouldBlockForDetails) {
            await detailsRefreshPromise;
            if (gen !== fetchGenRef.current) return;
          } else {
            detailsRefreshPromise.catch((error) => {
              console.error("Error loading conversation details:", error);
            });
          }
          setLoading(false);
          setInitialLoadSettled(true);
          return;
        }

        await refreshLatestMessages(gen);
        if (gen !== fetchGenRef.current) return;

        if (shouldBlockForDetails) {
          await detailsRefreshPromise;
          if (gen !== fetchGenRef.current) return;
        } else {
          detailsRefreshPromise.catch((error) => {
            console.error("Error loading conversation details:", error);
          });
        }

        setLoading(false);
        setInitialLoadSettled(true);
      } catch (error) {
        console.error("Error loading messages:", error);
        if (gen === fetchGenRef.current) {
          setLoading(false);
          setInitialLoadSettled(true);
        }
      }
    }

    pendingTempIdsRef.current = [];
    loadMessages();
  }, [
    applyConversationSnapshot,
    clearReconcileTimers,
    fetchGenRef,
    pendingTempIdsRef,
    refreshConversationDetails,
    refreshLatestMessages,
    selectedUserId,
    setInitialLoadSettled,
    setLoading,
  ]);
}

export function useChatConversationRefreshEffects(params: {
  selectedUserId: string;
  revalidateConversationSnapshot: () => void;
  revalidateInFlightRef: MutableRefObject<boolean>;
  clearReconcileTimers: () => void;
  detailsRefreshTimerRef: MutableRefObject<number | null>;
}): void {
  const {
    selectedUserId,
    revalidateConversationSnapshot,
    revalidateInFlightRef,
    clearReconcileTimers,
    detailsRefreshTimerRef,
  } = params;

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        revalidateConversationSnapshot();
      }
    };

    window.addEventListener("focus", revalidateConversationSnapshot);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", revalidateConversationSnapshot);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      revalidateInFlightRef.current = false;
    };
  }, [revalidateConversationSnapshot, revalidateInFlightRef]);

  useEffect(() => {
    const sidebarRefreshHandler = (event: Event) => {
      const customEvent =
        event as CustomEvent<InboxConversationsRefreshedDetail>;
      const conversationIds = customEvent.detail?.conversationIds;
      if (
        !Array.isArray(conversationIds) ||
        !conversationIds.includes(selectedUserId)
      ) {
        return;
      }

      revalidateConversationSnapshot();
    };

    window.addEventListener(
      INBOX_CONVERSATIONS_REFRESHED_EVENT,
      sidebarRefreshHandler,
    );
    return () => {
      window.removeEventListener(
        INBOX_CONVERSATIONS_REFRESHED_EVENT,
        sidebarRefreshHandler,
      );
    };
  }, [revalidateConversationSnapshot, selectedUserId]);

  useEffect(
    () => () => {
      clearReconcileTimers();
      if (detailsRefreshTimerRef.current) {
        window.clearTimeout(detailsRefreshTimerRef.current);
      }
    },
    [clearReconcileTimers, detailsRefreshTimerRef],
  );
}
