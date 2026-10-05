import { decryptData } from "@/lib/crypto";
import { fetchUserProfile } from "@/lib/graphApi";
import { resolveConversationAccount } from "@/lib/inbox/conversationAccount";
import { findConversationById, updateUserAvatar } from "@/lib/inboxRepository";
import { getConnectedInstagramAccounts } from "@/lib/userRepository";

// Instagram's profile picture links are signed and stop working after a few
// days. They are refreshed whenever the lead writes in, so a lead who has gone
// quiet ends up with a dead link. This asks Instagram for a current one.

interface RefreshConversationAvatarInput {
  conversationId: string;
  workspaceOwnerEmail: string;
}

// One lookup per conversation per window on each server instance, so a page
// full of expired pictures cannot turn into a burst of repeat Graph calls.
const REFRESH_COOLDOWN_MS = 10 * 60 * 1000;
const lastRefreshAtByConversation = new Map<string, number>();

function isCoolingDown(key: string, now: number): boolean {
  const lastRefreshAt = lastRefreshAtByConversation.get(key);
  return (
    lastRefreshAt !== undefined && now - lastRefreshAt < REFRESH_COOLDOWN_MS
  );
}

// Returns the conversation's current picture link, fetching a new one from
// Instagram when the cooldown allows. Null means there is no picture to show.
export async function refreshConversationAvatar({
  conversationId,
  workspaceOwnerEmail,
}: RefreshConversationAvatarInput): Promise<string | null> {
  const conversation = await findConversationById(
    conversationId,
    workspaceOwnerEmail,
  );
  if (!conversation) return null;

  const storedAvatar = conversation.avatar || null;
  if (!conversation.recipientId) return storedAvatar;

  const cooldownKey = `${workspaceOwnerEmail}:${conversationId}`;
  const now = Date.now();
  if (isCoolingDown(cooldownKey, now)) return storedAvatar;
  lastRefreshAtByConversation.set(cooldownKey, now);

  const accounts = await getConnectedInstagramAccounts(workspaceOwnerEmail);
  const account = resolveConversationAccount(conversation, accounts);
  if (!account) return storedAvatar;

  const freshAvatar = await fetchUserProfile(
    conversation.recipientId,
    decryptData(account.accessToken),
    account.graphVersion,
  );
  if (!freshAvatar) return storedAvatar;

  if (freshAvatar !== storedAvatar) {
    await updateUserAvatar(conversationId, workspaceOwnerEmail, freshAvatar);
  }
  return freshAvatar;
}
