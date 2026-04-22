import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedUsers, setCachedUsers } from "@/lib/cache";
import { emitInboxConversationsRefreshed } from "@/lib/inbox/clientRealtimeEvents";
import type { User } from "@/types/inbox";
import {
  fetchInboxConnectionState,
  fetchInboxUsers,
  prefetchConversationData,
} from "./api";
import type { UseInboxSidebarDataOptions } from "./types";
import {
  getChangedConversationIds,
  mergeUsersWithLocalRecency,
  normalizeUsersFromBackend,
  sortUsersByRecency,
} from "./utils";

interface UseInboxSidebarUsersResult {
  users: User[];
  setUsers: Dispatch<SetStateAction<User[]>>;
  loading: boolean;
  hasConnectedAccounts: boolean;
  refetchConversations: () => Promise<void>;
}

export default function useInboxSidebarUsers({
  epoch,
  markSidebarReady,
}: UseInboxSidebarDataOptions): UseInboxSidebarUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true);
  const refetchInFlightRef = useRef(false);

  const refetchConversations = useCallback(async () => {
    if (refetchInFlightRef.current) return;

    refetchInFlightRef.current = true;
    try {
      const freshUsers = await fetchInboxUsers();
      const normalizedUsers = normalizeUsersFromBackend(freshUsers);
      prefetchConversationData(normalizedUsers);
      setUsers((previousUsers) => {
        const mergedUsers = mergeUsersWithLocalRecency(
          previousUsers,
          normalizedUsers,
        );
        const changedConversationIds = getChangedConversationIds(
          previousUsers,
          mergedUsers,
        );
        setCachedUsers(mergedUsers).catch((error) => console.error(error));
        if (changedConversationIds.length > 0) {
          emitInboxConversationsRefreshed({
            conversationIds: changedConversationIds,
          });
        }
        return mergedUsers;
      });
    } finally {
      refetchInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    async function loadUsers() {
      const currentEpoch = epoch;
      try {
        const cachedUsers = await getCachedUsers();
        if (cachedUsers?.length) {
          setUsers(sortUsersByRecency(normalizeUsersFromBackend(cachedUsers)));
          setLoading(false);
        }

        const connectionState = await fetchInboxConnectionState();
        setHasConnectedAccounts(connectionState.hasConnectedAccounts);

        if (!connectionState.hasConnectedAccounts) {
          setUsers([]);
          setCachedUsers([]).catch((error) => console.error(error));
          return;
        }

        const freshUsers = await fetchInboxUsers();
        const normalizedUsers = normalizeUsersFromBackend(freshUsers);
        prefetchConversationData(normalizedUsers);
        setUsers((previousUsers) => {
          const mergedUsers = mergeUsersWithLocalRecency(
            previousUsers,
            normalizedUsers,
          );
          setCachedUsers(mergedUsers).catch((error) => console.error(error));
          return mergedUsers;
        });
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setLoading(false);
        markSidebarReady(currentEpoch);
      }
    }

    loadUsers();
  }, [epoch, markSidebarReady]);

  return {
    users,
    setUsers,
    loading,
    hasConnectedAccounts,
    refetchConversations,
  };
}
