import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import {
  getCachedSetterAiSessions,
  getSetterAiLastEmail,
} from "@/lib/setterAiCache";

export async function bootstrapSessions(params: {
  setCurrentEmail: Dispatch<SetStateAction<string | null>>;
  setChatSessions: Dispatch<SetStateAction<ClientChatSession[]>>;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setIsBootLoading: Dispatch<SetStateAction<boolean>>;
  deletedSessionIdsRef: MutableRefObject<Set<string>>;
  hydrateDeletedSessionTombstonesFn: (email: string) => Promise<void>;
  resolvePreferredSessionIdFn: (sessions: ClientChatSession[]) => string | null;
  refreshSessionsFn: (forceNetwork?: boolean) => Promise<ClientChatSession[]>;
  cancelledRef: MutableRefObject<boolean>;
}): Promise<void> {
  const {
    setCurrentEmail,
    setChatSessions,
    setActiveSessionId,
    setIsBootLoading,
    deletedSessionIdsRef,
    hydrateDeletedSessionTombstonesFn,
    resolvePreferredSessionIdFn,
    refreshSessionsFn,
    cancelledRef,
  } = params;
  let hydratedFromCache = false;
  try {
    const cachedEmail = await getSetterAiLastEmail();
    if (!cancelledRef.current && cachedEmail) {
      const normalized = cachedEmail.trim().toLowerCase();
      setCurrentEmail(normalized);
      await hydrateDeletedSessionTombstonesFn(normalized);
      const cachedSessions = await getCachedSetterAiSessions(normalized);
      const tombstonedIds = deletedSessionIdsRef.current;
      const filteredCachedSessions =
        cachedSessions?.filter((session) => !tombstonedIds.has(session.id)) ||
        [];
      if (filteredCachedSessions.length > 0) {
        hydratedFromCache = true;
        setChatSessions(filteredCachedSessions);
        setActiveSessionId(resolvePreferredSessionIdFn(filteredCachedSessions));
        setIsBootLoading(false);
      }
    }
  } finally {
    if (!cancelledRef.current) {
      await refreshSessionsFn(false).catch(() => null);
      if (!hydratedFromCache) {
        setIsBootLoading(false);
      }
    }
  }
}
