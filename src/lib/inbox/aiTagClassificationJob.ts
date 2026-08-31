import { listWorkspaceAiTags } from "@/lib/aiTagsRepository";
import { classifyConversationAiTags } from "@/lib/inbox/aiTagClassifier";
import {
  findConversationById,
  getMessagesPageFromDb,
  setConversationAiTags,
} from "@/lib/inboxRepository";

const CLASSIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
const CLASSIFICATION_MESSAGE_LIMIT = 40;

/**
 * Re-runs AI tag classification for a conversation after a genuine inbound
 * message, unless it was already classified within the cooldown window.
 * Never throws - a classification failure should never affect message
 * delivery, since this runs as background work after the webhook has
 * already acknowledged Meta's request (see the `after()` call site).
 */
export async function maybeClassifyConversationAiTags(
  conversationId: string,
  ownerEmail: string,
): Promise<void> {
  try {
    const tagDefinitions = await listWorkspaceAiTags(ownerEmail);
    if (tagDefinitions.length === 0) return;

    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation) return;

    if (conversation.aiTagsClassifiedAt) {
      const lastClassifiedMs = new Date(
        conversation.aiTagsClassifiedAt,
      ).getTime();
      if (
        Number.isFinite(lastClassifiedMs) &&
        Date.now() - lastClassifiedMs < CLASSIFICATION_COOLDOWN_MS
      ) {
        return;
      }
    }

    const { messages } = await getMessagesPageFromDb(
      conversationId,
      ownerEmail,
      CLASSIFICATION_MESSAGE_LIMIT,
    );

    const tagIds = await classifyConversationAiTags(
      messages,
      tagDefinitions.map((tag) => ({
        id: tag.id,
        name: tag.name,
        criteria: tag.criteria,
      })),
    );

    await setConversationAiTags(
      conversationId,
      ownerEmail,
      tagIds,
      new Date().toISOString(),
    );
  } catch (error) {
    console.error(
      `[AiTagClassification] Failed for conversation ${conversationId}:`,
      error,
    );
  }
}
