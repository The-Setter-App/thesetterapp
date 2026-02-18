"use client";

import { getCachedLeads, getCachedUsers, setCachedLeads, setCachedUsers } from "@/lib/clientCache";
import { INBOX_STATUS_COLOR_CLASS_MAP } from "@/lib/status/config";
import type { StatusType } from "@/types/status";

export const CONVERSATION_STATUS_SYNCED_EVENT = "conversationStatusSynced";
export const LEGACY_USER_STATUS_UPDATED_EVENT = "userStatusUpdated";

type ConversationStatusSyncedDetail = {
  conversationId: string;
  status: StatusType;
};

export async function syncConversationStatusToClientCache(
  conversationId: string,
  status: StatusType
): Promise<void> {
  const [cachedUsers, cachedLeads] = await Promise.all([getCachedUsers(), getCachedLeads()]);

  if (cachedUsers?.length) {
    const nextUsers = cachedUsers.map((user) =>
      user.id === conversationId
        ? {
            ...user,
            status,
            statusColor: INBOX_STATUS_COLOR_CLASS_MAP[status],
          }
        : user
    );
    await setCachedUsers(nextUsers);
  }

  if (cachedLeads?.length) {
    const nextLeads = cachedLeads.map((lead) =>
      lead.id === conversationId ? { ...lead, status } : lead
    );
    await setCachedLeads(nextLeads);
  }
}

export function emitConversationStatusSynced(detail: ConversationStatusSyncedDetail): void {
  window.dispatchEvent(
    new CustomEvent(CONVERSATION_STATUS_SYNCED_EVENT, {
      detail,
    })
  );
  window.dispatchEvent(
    new CustomEvent(LEGACY_USER_STATUS_UPDATED_EVENT, {
      detail: {
        userId: detail.conversationId,
        status: detail.status,
      },
    })
  );
}
