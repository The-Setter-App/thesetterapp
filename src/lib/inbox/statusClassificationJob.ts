import { classifyConversationStatus } from "@/lib/inbox/statusClassifier";
import {
  applyStatusClassificationResult,
  findConversationById,
  getMessagesPageFromDb,
} from "@/lib/inboxRepository";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";

const CLASSIFICATION_COOLDOWN_MS = 5 * 60 * 1000;
const CLASSIFICATION_MESSAGE_LIMIT = 40;
const EMPTY_DESCRIPTION_PLACEHOLDER = "No description added";

/**
 * Re-runs status classification for a conversation after a genuine inbound
 * message, unless it was already classified within the cooldown window.
 * Every status's description doubles as AI matching criteria - default
 * statuses included, not just custom ones - so a workspace that hasn't
 * written any real description text simply gets no classification, rather
 * than matching on a placeholder. Never throws - a classification failure
 * should never affect message delivery, since this runs as background work
 * after the webhook has already acknowledged Meta's request (see the
 * after() call site).
 */
export async function maybeClassifyConversationStatus(
  conversationId: string,
  ownerEmail: string,
): Promise<void> {
  try {
    const allTags = await listWorkspaceAssignableTags(ownerEmail);
    const statusOptions = allTags
      .filter(
        (tag) =>
          tag.description.trim() &&
          tag.description.trim() !== EMPTY_DESCRIPTION_PLACEHOLDER,
      )
      .map((tag) => ({ name: tag.name, description: tag.description }));
    if (statusOptions.length === 0) return;

    const conversation = await findConversationById(conversationId, ownerEmail);
    if (!conversation) return;

    if (conversation.statusClassifiedAt) {
      const lastClassifiedMs = new Date(
        conversation.statusClassifiedAt,
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

    const matchedStatus = await classifyConversationStatus(
      messages,
      statusOptions,
    );

    await applyStatusClassificationResult(
      conversationId,
      ownerEmail,
      matchedStatus,
      new Date().toISOString(),
    );
  } catch (error) {
    console.error(
      `[StatusClassification] Failed for conversation ${conversationId}:`,
      error,
    );
  }
}
