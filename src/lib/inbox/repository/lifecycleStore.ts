import { AUDIO_BUCKET, CONVERSATIONS_COLLECTION, getInboxSupabase, MESSAGES_COLLECTION } from "@/lib/inbox/repository/core";

export async function purgeInboxDataForInstagramAccount(
  ownerEmail: string,
  options: { accountId?: string; ownerInstagramUserId?: string },
): Promise<{
  conversationsDeleted: number;
  messagesDeleted: number;
  audioFilesDeleted: number;
}> {
  const supabase = getInboxSupabase();

  const { data: conversations } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("id,payload")
    .eq("owner_email", ownerEmail);

  const filteredConversationIds = (conversations ?? [])
    .filter((row) => {
      const payload = (row as { payload: { accountId?: string; ownerInstagramUserId?: string } }).payload;
      const accountMatch = options.accountId ? payload.accountId === options.accountId : false;
      const ownerMatch = options.ownerInstagramUserId
        ? payload.ownerInstagramUserId === options.ownerInstagramUserId
        : false;
      return accountMatch || ownerMatch;
    })
    .map((row) => (row as { id: string }).id)
    .filter((id) => typeof id === "string" && id.length > 0);

  if (filteredConversationIds.length === 0) {
    return {
      conversationsDeleted: 0,
      messagesDeleted: 0,
      audioFilesDeleted: 0,
    };
  }

  const { data: audioRows } = await supabase
    .from(MESSAGES_COLLECTION)
    .select("payload")
    .eq("owner_email", ownerEmail)
    .in("conversation_id", filteredConversationIds);

  const audioPaths = (audioRows ?? [])
    .map((row) => {
      const payload = (row as { payload: { audioStorage?: { fileId?: string } } }).payload;
      return payload.audioStorage?.fileId;
    })
    .filter((fileId): fileId is string => typeof fileId === "string" && fileId.length > 0);

  const { count: messagesDeleted } = await supabase
    .from(MESSAGES_COLLECTION)
    .delete({ count: "exact" })
    .eq("owner_email", ownerEmail)
    .in("conversation_id", filteredConversationIds);

  const { count: conversationsDeleted } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .delete({ count: "exact" })
    .eq("owner_email", ownerEmail)
    .in("id", filteredConversationIds);

  let audioFilesDeleted = 0;
  if (audioPaths.length > 0) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(audioPaths);
    if (!error) {
      audioFilesDeleted = audioPaths.length;
    }
  }

  return {
    conversationsDeleted: conversationsDeleted ?? 0,
    messagesDeleted: messagesDeleted ?? 0,
    audioFilesDeleted,
  };
}
