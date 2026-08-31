import { useCallback } from "react";
import {
  updateConversationPriorityAction,
  updateUserStatusAction,
} from "@/app/actions/inbox";
import {
  emitConversationStatusSynced,
  syncConversationStatusToClientCache,
} from "@/lib/status/clientSync";
import type { StatusType, User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import type { ConversationAction } from "./types";

interface UseInboxSidebarActionsOptions {
  users: User[];
  statusCatalog: TagRow[];
  applyUserStatusUpdate: (
    userId: string,
    status: StatusType,
    updatedAt?: string,
  ) => void;
  applyUserPriorityUpdate: (userId: string, isPriority: boolean) => void;
}

interface UseInboxSidebarActionsResult {
  handleConversationAction: (
    userId: string,
    action: ConversationAction,
  ) => Promise<void>;
}

export default function useInboxSidebarActions({
  users,
  statusCatalog,
  applyUserStatusUpdate,
  applyUserPriorityUpdate,
}: UseInboxSidebarActionsOptions): UseInboxSidebarActionsResult {
  const handleConversationAction = useCallback(
    async (userId: string, action: ConversationAction) => {
      if (action === "delete") {
        return;
      }

      if (action === "qualified") {
        // Whichever status currently holds the "qualified" role - falls
        // back to the literal name only if a workspace somehow has none
        // (shouldn't happen once seeded, but never crash the quick action).
        const nextStatus: StatusType =
          statusCatalog.find((tag) => tag.role === "qualified")?.name ??
          "Qualified";
        const previousStatus = users.find((user) => user.id === userId)?.status;

        applyUserStatusUpdate(userId, nextStatus);
        emitConversationStatusSynced({
          conversationId: userId,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
        syncConversationStatusToClientCache(userId, nextStatus).catch((error) =>
          console.error("Failed to sync status cache:", error),
        );

        try {
          await updateUserStatusAction(userId, nextStatus);
        } catch (error) {
          console.error("Failed to update status from quick actions:", error);
          if (previousStatus) {
            applyUserStatusUpdate(userId, previousStatus);
            emitConversationStatusSynced({
              conversationId: userId,
              status: previousStatus,
              updatedAt: new Date().toISOString(),
            });
            syncConversationStatusToClientCache(userId, previousStatus).catch(
              (cacheError) =>
                console.error("Failed to sync status cache:", cacheError),
            );
          }
        }
        return;
      }

      const nextPriority = action === "priority";
      const previousPriority = Boolean(
        users.find((user) => user.id === userId)?.isPriority,
      );

      applyUserPriorityUpdate(userId, nextPriority);

      try {
        await updateConversationPriorityAction(userId, nextPriority);
      } catch (error) {
        console.error("Failed to update priority from quick actions:", error);
        applyUserPriorityUpdate(userId, previousPriority);
      }
    },
    [applyUserPriorityUpdate, applyUserStatusUpdate, statusCatalog, users],
  );

  return { handleConversationAction };
}
