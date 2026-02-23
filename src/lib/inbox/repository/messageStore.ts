import { getInboxSupabase, MESSAGES_COLLECTION } from "@/lib/inbox/repository/core";
import type { Message } from "@/types/inbox";

type MessageRow = {
  owner_email: string;
  id: string;
  conversation_id: string;
  payload: Message;
  timestamp_text: string | null;
  is_empty: boolean | null;
};

type MessageCursor = {
  timestamp: string;
  id: string;
};

function hasDisplayableMessageContent(message: Message): boolean {
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (text.length > 0) return true;
  if (message.attachmentUrl) return true;
  return (
    message.type === "audio" ||
    message.type === "image" ||
    message.type === "video" ||
    message.type === "file"
  );
}

function mapMessage(row: MessageRow): Message {
  return {
    ...row.payload,
    id: row.id,
  };
}

function sortNewestFirst(a: MessageRow, b: MessageRow): number {
  const at = a.timestamp_text ?? "";
  const bt = b.timestamp_text ?? "";
  if (at > bt) return -1;
  if (at < bt) return 1;
  return b.id.localeCompare(a.id);
}

function isBeforeCursor(row: MessageRow, cursor: MessageCursor): boolean {
  const timestamp = row.timestamp_text ?? "";
  if (timestamp < cursor.timestamp) return true;
  if (timestamp > cursor.timestamp) return false;
  return row.id < cursor.id;
}

export async function getMessagesFromDb(conversationId: string, ownerEmail: string): Promise<Message[]> {
  try {
    const supabase = getInboxSupabase();
    const { data, error } = await supabase
      .from(MESSAGES_COLLECTION)
      .select("owner_email,id,conversation_id,payload,timestamp_text,is_empty")
      .eq("conversation_id", conversationId)
      .eq("owner_email", ownerEmail)
      .order("timestamp_text", { ascending: true })
      .order("id", { ascending: true });

    if (error || !data) return [];
    return (data as MessageRow[]).map(mapMessage);
  } catch (error) {
    console.error(`[InboxRepo] Error fetching messages for ${conversationId}:`, error);
    return [];
  }
}

export async function saveMessageToDb(message: Message, conversationId: string, ownerEmail: string): Promise<void> {
  const supabase = getInboxSupabase();
  await supabase.from(MESSAGES_COLLECTION).upsert(
    {
      owner_email: ownerEmail,
      id: message.id,
      conversation_id: conversationId,
      payload: message,
      timestamp_text: message.timestamp ?? null,
      is_empty: message.isEmpty ?? null,
      client_temp_id: message.clientTempId ?? null,
      source: message.source ?? null,
      type: message.type,
      from_me: message.fromMe,
      audio_storage: message.audioStorage ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_email,id" },
  );
}

export async function saveMessagesToDb(messages: Message[], conversationId: string, ownerEmail: string): Promise<void> {
  if (messages.length === 0) return;
  const supabase = getInboxSupabase();

  const rows = messages.map((message) => ({
    owner_email: ownerEmail,
    id: message.id,
    conversation_id: conversationId,
    payload: message,
    timestamp_text: message.timestamp ?? null,
    is_empty: message.isEmpty ?? null,
    client_temp_id: message.clientTempId ?? null,
    source: message.source ?? null,
    type: message.type,
    from_me: message.fromMe,
    audio_storage: message.audioStorage ?? null,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from(MESSAGES_COLLECTION).upsert(rows, { onConflict: "owner_email,id" });
}

export function encodeMessagesCursor(cursor: MessageCursor): string {
  const raw = JSON.stringify(cursor);
  return Buffer.from(raw, "utf8").toString("base64url");
}

export function decodeMessagesCursor(cursor: string): MessageCursor | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as MessageCursor;
    if (!parsed?.timestamp || !parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getMessagesPageFromDb(
  conversationId: string,
  ownerEmail: string,
  limit: number,
  cursor?: string,
): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> {
  const supabase = getInboxSupabase();

  const { data } = await supabase
    .from(MESSAGES_COLLECTION)
    .select("owner_email,id,conversation_id,payload,timestamp_text,is_empty")
    .eq("conversation_id", conversationId)
    .eq("owner_email", ownerEmail)
    .not("timestamp_text", "is", null)
    .order("timestamp_text", { ascending: false })
    .order("id", { ascending: false })
    .limit(Math.max(limit * 3, 120));

  const parsedCursor = cursor ? decodeMessagesCursor(cursor) : null;
  let rows = (data ?? []) as MessageRow[];
  rows = rows.filter((row) => {
    if (row.is_empty !== true) return true;
    return hasDisplayableMessageContent(row.payload);
  });

  if (parsedCursor) {
    rows = rows.filter((row) => isBeforeCursor(row, parsedCursor));
  }

  rows.sort(sortNewestFirst);
  const pageRows = rows.slice(0, limit);
  const hasMore = rows.length > limit;

  const newestToOldest = pageRows.map(mapMessage);
  const oldestToNewest = [...newestToOldest].reverse();

  const last = pageRows[pageRows.length - 1];
  if (!last?.timestamp_text) {
    return {
      messages: oldestToNewest,
      nextCursor: null,
      hasMore: false,
    };
  }

  return {
    messages: oldestToNewest,
    nextCursor: hasMore ? encodeMessagesCursor({ timestamp: last.timestamp_text, id: last.id }) : null,
    hasMore,
  };
}
