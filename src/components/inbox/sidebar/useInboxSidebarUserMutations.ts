import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { setCachedUsers } from "@/lib/cache";
import { findConversationForRealtimeMessage } from "@/lib/inbox/clientConversationSync";
import type { ConversationPreviewHydrationPayload } from "@/lib/inbox/clientPreviewSync";
import { getInboxStatusColorClass } from "@/lib/status/config";
import type { SSEMessageData, StatusType, User } from "@/types/inbox";
import { buildRealtimePreviewText, sortUsersByRecency } from "./utils";

interface UseInboxSidebarUserMutationsOptions {
  setUsers: Dispatch<SetStateAction<User[]>>;
}

interface UseInboxSidebarUserMutationsResult {
  applyHydratedPreview: (
    payload: ConversationPreviewHydrationPayload,
  ) => boolean;
  applyUserStatusUpdate: (
    userId: string,
    status: StatusType,
    updatedAt?: string,
  ) => void;
  applyUserPriorityUpdate: (userId: string, isPriority: boolean) => void;
  applyOptimisticRealtimePreview: (
    eventType: "new_message" | "message_echo",
    data: SSEMessageData,
  ) => void;
}

export default function useInboxSidebarUserMutations({
  setUsers,
}: UseInboxSidebarUserMutationsOptions): UseInboxSidebarUserMutationsResult {
  const applyHydratedPreview = useCallback(
    (payload: ConversationPreviewHydrationPayload): boolean => {
      let applied = false;
      setUsers((previousUsers) => {
        const index = previousUsers.findIndex(
          (user) => user.id === payload.userId,
        );
        if (index === -1) return previousUsers;

        const nextUsers = [...previousUsers];
        nextUsers[index] = {
          ...nextUsers[index],
          lastMessage: payload.lastMessage || nextUsers[index].lastMessage,
          time: payload.time || nextUsers[index].time,
          updatedAt: payload.updatedAt || nextUsers[index].updatedAt,
          unread: payload.clearUnread ? 0 : nextUsers[index].unread,
          needsReply: payload.clearUnread ? false : nextUsers[index].needsReply,
        };
        const sortedUsers = sortUsersByRecency(nextUsers);
        setCachedUsers(sortedUsers).catch((error) => console.error(error));
        applied = true;
        return sortedUsers;
      });
      return applied;
    },
    [setUsers],
  );

  const applyUserStatusUpdate = useCallback(
    (userId: string, status: StatusType, updatedAt?: string) => {
      const nextUpdatedAt = updatedAt ?? new Date().toISOString();
      setUsers((previousUsers) => {
        const index = previousUsers.findIndex((user) => user.id === userId);
        if (index === -1) return previousUsers;

        const nextUsers = [...previousUsers];
        nextUsers[index] = {
          ...nextUsers[index],
          status,
          statusColor: getInboxStatusColorClass(status),
          updatedAt: nextUpdatedAt,
        };
        setCachedUsers(nextUsers).catch((error) => console.error(error));
        return nextUsers;
      });
    },
    [setUsers],
  );

  const applyUserPriorityUpdate = useCallback(
    (userId: string, isPriority: boolean) => {
      setUsers((previousUsers) => {
        const index = previousUsers.findIndex((user) => user.id === userId);
        if (index === -1) return previousUsers;

        const nextUsers = [...previousUsers];
        nextUsers[index] = {
          ...nextUsers[index],
          isPriority,
        };
        setCachedUsers(nextUsers).catch((error) => console.error(error));
        return nextUsers;
      });
    },
    [setUsers],
  );

  const applyOptimisticRealtimePreview = useCallback(
    (eventType: "new_message" | "message_echo", data: SSEMessageData) => {
      setUsers((previousUsers) => {
        const matchedConversation = findConversationForRealtimeMessage(
          previousUsers,
          data,
        );
        if (!matchedConversation) return previousUsers;

        const index = previousUsers.findIndex(
          (user) => user.id === matchedConversation.id,
        );
        if (index === -1) return previousUsers;

        const previewText = buildRealtimePreviewText(eventType, data);
        const updatedAt = new Date(data.timestamp).toISOString();
        const nextUsers = [...previousUsers];
        const currentUser = nextUsers[index];
        const outgoing = eventType === "message_echo" || Boolean(data.fromMe);
        nextUsers[index] = {
          ...currentUser,
          lastMessage: previewText,
          time: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          updatedAt,
          unread: outgoing ? 0 : (currentUser.unread ?? 0) + 1,
          needsReply: !outgoing,
        };

        return sortUsersByRecency(nextUsers);
      });
    },
    [setUsers],
  );

  return {
    applyHydratedPreview,
    applyUserStatusUpdate,
    applyUserPriorityUpdate,
    applyOptimisticRealtimePreview,
  };
}
