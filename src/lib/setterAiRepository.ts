import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ChatSession, Message } from "@/types/ai";

const MAX_TITLE_LENGTH = 30;
const CACHE_TTL_MS = 60 * 1000;

type SessionRow = {
  id: string;
  email: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
  linked_inbox_conversation_id: string | null;
  linked_inbox_conversation_label: string | null;
};

type MessageRow = {
  id: string;
  email: string;
  session_id: string;
  role: "user" | "ai";
  text: string;
  created_at: string;
  request_id: string | null;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const sessionsCache = new Map<string, CacheEntry<ChatSession[]>>();
const messagesCache = new Map<string, CacheEntry<Message[]>>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildDefaultTitleFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "New Conversation";
  if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_TITLE_LENGTH)}...`;
}

function mapSessionRow(row: SessionRow): ChatSession {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessagePreview: row.last_message_preview ?? undefined,
    messages: [],
    linkedInboxConversationId: row.linked_inbox_conversation_id,
    linkedInboxConversationLabel: row.linked_inbox_conversation_label,
  };
}

function mapMessageRow(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at,
  };
}

function getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = map.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    map.delete(key);
    return null;
  }
  return cached.value;
}

function setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T): void {
  map.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateSessionCache(email: string): void {
  sessionsCache.delete(`sessions:${email}`);
}

function invalidateMessageCache(email: string, sessionId: string): void {
  messagesCache.delete(`messages:${email}:${sessionId}`);
}

export async function listSetterAiSessionsByEmail(email: string): Promise<ChatSession[]> {
  const normalizedEmail = normalizeEmail(email);
  const cacheKey = `sessions:${normalizedEmail}`;
  const cached = getCached(sessionsCache, cacheKey);
  if (cached) return cached;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("setter_ai_sessions")
    .select("id,email,title,created_at,updated_at,last_message_preview,linked_inbox_conversation_id,linked_inbox_conversation_label")
    .eq("email", normalizedEmail)
    .order("updated_at", { ascending: false });

  const sessions = ((data ?? []) as SessionRow[]).map(mapSessionRow);
  setCached(sessionsCache, cacheKey, sessions);
  return sessions;
}

export async function createSetterAiSession(email: string, title?: string): Promise<ChatSession> {
  const normalizedEmail = normalizeEmail(email);
  const safeTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 80)
      : "New Conversation";

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("setter_ai_sessions")
    .insert({
      email: normalizedEmail,
      title: safeTitle,
      created_at: now,
      updated_at: now,
      linked_inbox_conversation_id: null,
      linked_inbox_conversation_label: null,
    })
    .select("id,email,title,created_at,updated_at,last_message_preview,linked_inbox_conversation_id,linked_inbox_conversation_label")
    .single();

  if (error || !data) {
    throw new Error("Failed to create Setter AI session");
  }

  invalidateSessionCache(normalizedEmail);
  return mapSessionRow(data as SessionRow);
}

export async function getSetterAiSessionById(email: string, sessionId: string): Promise<ChatSession | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!isUuid(sessionId)) return null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("setter_ai_sessions")
    .select("id,email,title,created_at,updated_at,last_message_preview,linked_inbox_conversation_id,linked_inbox_conversation_label")
    .eq("email", normalizedEmail)
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return null;
  return mapSessionRow(data as SessionRow);
}

export async function updateSetterAiSessionLeadLink(
  email: string,
  sessionId: string,
  link: { linkedInboxConversationId: string | null; linkedInboxConversationLabel: string | null },
): Promise<ChatSession | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!isUuid(sessionId)) return null;

  const linkedInboxConversationId =
    typeof link.linkedInboxConversationId === "string" && link.linkedInboxConversationId.trim().length > 0
      ? link.linkedInboxConversationId.trim().slice(0, 120)
      : null;
  const linkedInboxConversationLabel =
    typeof link.linkedInboxConversationLabel === "string" && link.linkedInboxConversationLabel.trim().length > 0
      ? link.linkedInboxConversationLabel.trim().slice(0, 120)
      : null;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("setter_ai_sessions")
    .update({
      linked_inbox_conversation_id: linkedInboxConversationId,
      linked_inbox_conversation_label: linkedInboxConversationLabel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("email", normalizedEmail)
    .select("id,email,title,created_at,updated_at,last_message_preview,linked_inbox_conversation_id,linked_inbox_conversation_label")
    .maybeSingle();

  if (!data) return null;

  invalidateSessionCache(normalizedEmail);
  invalidateMessageCache(normalizedEmail, sessionId);
  return mapSessionRow(data as SessionRow);
}

export async function listSetterAiMessages(email: string, sessionId: string): Promise<Message[]> {
  const normalizedEmail = normalizeEmail(email);
  if (!isUuid(sessionId)) return [];

  const cacheKey = `messages:${normalizedEmail}:${sessionId}`;
  const cached = getCached(messagesCache, cacheKey);
  if (cached) return cached;

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("setter_ai_messages")
    .select("id,email,session_id,role,text,created_at,request_id")
    .eq("email", normalizedEmail)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const messages = ((data ?? []) as MessageRow[]).map(mapMessageRow);
  setCached(messagesCache, cacheKey, messages);
  return messages;
}

export async function buildSetterAiModelContext(
  email: string,
  sessionId: string,
  incomingUserMessage: string,
  params?: { maxHistory?: number; systemPrompt?: string; leadContextBlock?: string | null; maxTotalChars?: number },
): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  const safeIncomingMessage = incomingUserMessage.trim().slice(0, 8000);
  const maxHistory = params?.maxHistory ?? 30;
  const maxTotalChars = params?.maxTotalChars ?? 24000;
  const previousMessages = await listSetterAiMessages(email, sessionId);
  const context: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  const systemPrompt =
    typeof params?.systemPrompt === "string" && params.systemPrompt.trim()
      ? params.systemPrompt.trim().slice(0, 8000)
      : "";
  if (systemPrompt) {
    context.push({ role: "system", content: systemPrompt });
  }

  const leadContextBlock =
    typeof params?.leadContextBlock === "string" && params.leadContextBlock.trim()
      ? params.leadContextBlock.trim().slice(0, 8000)
      : "";
  const userMessageWithLeadContext = leadContextBlock
    ? ["this is the leads context:", leadContextBlock, "", "this is my message:", safeIncomingMessage].join("\n").slice(0, 12000)
    : safeIncomingMessage;

  const history = previousMessages.slice(-maxHistory).map((message) => ({
    role: (message.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: message.text.trim().slice(0, 8000),
  }));

  const baseChars = context.reduce((sum, item) => sum + item.content.length, 0);
  const incomingChars = userMessageWithLeadContext.length;
  const remainingForHistory = Math.max(maxTotalChars - baseChars - incomingChars, 0);

  if (remainingForHistory > 0) {
    const selected: typeof history = [];
    let used = 0;
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const candidate = history[i];
      if (!candidate) continue;
      const nextUsed = used + candidate.content.length;
      if (nextUsed > remainingForHistory) break;
      selected.push(candidate);
      used = nextUsed;
    }
    selected.reverse();
    context.push(...selected);
  }

  context.push({ role: "user", content: userMessageWithLeadContext });
  return context;
}

export async function appendSetterAiExchangeAfterStream(
  email: string,
  sessionId: string,
  userText: string,
  aiText: string,
  requestId?: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!isUuid(sessionId)) {
    throw new Error("Invalid session id");
  }

  const safeUserText = userText.trim().slice(0, 8000);
  const safeAiText = aiText.trim().slice(0, 8000);
  const safeRequestId = typeof requestId === "string" && requestId.trim().length > 0 ? requestId.trim().slice(0, 120) : undefined;
  if (!safeUserText || !safeAiText) {
    throw new Error("Cannot persist empty exchange");
  }

  const supabase = getSupabaseServerClient();

  const { data: sessionRow } = await supabase
    .from("setter_ai_sessions")
    .select("id,email,title")
    .eq("id", sessionId)
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!sessionRow) {
    throw new Error("Session not found");
  }

  const { count } = await supabase
    .from("setter_ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("email", normalizedEmail)
    .eq("session_id", sessionId);

  const rpcResult = await supabase.rpc("append_setter_ai_exchange", {
    p_email: normalizedEmail,
    p_session_id: sessionId,
    p_user_text: safeUserText,
    p_ai_text: safeAiText,
    p_request_id: safeRequestId ?? null,
  });

  if (rpcResult.error && rpcResult.error.code !== "23505") {
    throw new Error(rpcResult.error.message);
  }

  const shouldSetTitle = (count ?? 0) === 0 && (sessionRow as { title: string }).title === "New Conversation";
  if (shouldSetTitle) {
    await supabase
      .from("setter_ai_sessions")
      .update({ title: buildDefaultTitleFromText(safeUserText) })
      .eq("id", sessionId)
      .eq("email", normalizedEmail);
  }

  invalidateSessionCache(normalizedEmail);
  invalidateMessageCache(normalizedEmail, sessionId);
}

export async function deleteSetterAiSession(email: string, sessionId: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  if (!isUuid(sessionId)) return false;

  const supabase = getSupabaseServerClient();
  const { error, count } = await supabase
    .from("setter_ai_sessions")
    .delete({ count: "exact" })
    .eq("id", sessionId)
    .eq("email", normalizedEmail);

  if (error || !count) {
    return false;
  }

  invalidateSessionCache(normalizedEmail);
  invalidateMessageCache(normalizedEmail, sessionId);
  return true;
}
