import { updateConversationPreview } from "@/app/actions/inbox";
import { getCachedUsers } from "@/lib/cache";
import { applyConversationPreviewUpdate } from "@/lib/inbox/clientPreviewSync";
import type { Message, User } from "@/types/inbox";
import { NO_MESSAGES_PLACEHOLDER_REGEX } from "./useChatConstants";
import { getMessagePreviewText } from "./useChatUtils";

export async function hydrateSidebarPreviewFromMessages(params: {
  selectedUserId: string;
  messages: Message[];
  user: User | null;
}): Promise<void> {
  const { selectedUserId, messages, user } = params;

  if (!messages.length) return;

  const latest = [...messages].reverse().find((message) => {
    const text = typeof message.text === "string" ? message.text.trim() : "";
    return (
      Boolean(text) || message.type !== "text" || Boolean(message.attachmentUrl)
    );
  });
  if (!latest) return;

  const previewText = getMessagePreviewText(latest);
  if (!previewText) return;

  const previewTime = latest.timestamp
    ? new Date(latest.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  const previewUpdatedAt = latest.timestamp
    ? new Date(latest.timestamp).toISOString()
    : new Date().toISOString();

  const cachedUsers = await getCachedUsers();
  const target = cachedUsers?.find(
    (cachedUser) => cachedUser.id === selectedUserId,
  );
  const currentPreview =
    target?.lastMessage?.trim() || user?.lastMessage?.trim() || "";
  const hasCurrentPreview =
    Boolean(currentPreview) &&
    !NO_MESSAGES_PLACEHOLDER_REGEX.test(currentPreview);
  const currentUpdatedAtMs = Date.parse(
    target?.updatedAt ?? user?.updatedAt ?? "",
  );
  const previewUpdatedAtMs = Date.parse(previewUpdatedAt);

  if (hasCurrentPreview) {
    const canCompareUpdatedAt =
      Number.isFinite(currentUpdatedAtMs) &&
      Number.isFinite(previewUpdatedAtMs);

    if (canCompareUpdatedAt && currentUpdatedAtMs >= previewUpdatedAtMs) {
      return;
    }
    if (!canCompareUpdatedAt && currentPreview === previewText) {
      return;
    }
  }

  applyConversationPreviewUpdate({
    conversationId: selectedUserId,
    lastMessage: previewText,
    time: previewTime,
    updatedAt: previewUpdatedAt,
  }).catch((error) => console.error("Preview sync failed:", error));

  updateConversationPreview(
    selectedUserId,
    previewText,
    previewTime,
    false,
    false,
    previewUpdatedAt,
  ).catch((error) =>
    console.error("Failed to hydrate conversation preview:", error),
  );
}

export function syncOutgoingConversationPreview(params: {
  selectedUserId: string;
  previewText: string;
  previewTime: string;
  previewUpdatedAt: string;
}): void {
  const { selectedUserId, previewText, previewTime, previewUpdatedAt } = params;

  applyConversationPreviewUpdate({
    conversationId: selectedUserId,
    lastMessage: previewText,
    time: previewTime,
    updatedAt: previewUpdatedAt,
    clearUnread: true,
  }).catch((error) => console.error("Failed to sync preview locally:", error));

  updateConversationPreview(
    selectedUserId,
    previewText,
    previewTime,
    false,
    true,
    previewUpdatedAt,
  ).catch((error) => console.error("Failed to update preview:", error));
}
