import {
  clearCachedSetterAiMessages,
  getDeletedSetterAiSessionIds,
  markDeletedSetterAiSessionId,
  setCachedSetterAiMessages,
  setCachedSetterAiSessions,
  unmarkDeletedSetterAiSessionId,
} from "@/lib/setterAiCache";
import type { ClientChatSession } from "@/components/setter-ai/lib/setterAiClientConstants";
import type { Message } from "@/types/ai";

function stripSessionMessages(sessions: ClientChatSession[]) {
  return sessions.map((session) => ({ ...session, messages: [] }));
}

export async function cacheSessionList(
  email: string,
  sessions: ClientChatSession[],
): Promise<void> {
  await setCachedSetterAiSessions(email, stripSessionMessages(sessions));
}

export async function cacheSessionMessages(
  email: string,
  sessionId: string,
  messages: Message[],
): Promise<void> {
  await setCachedSetterAiMessages(email, sessionId, messages);
}

export async function clearSessionMessagesCache(
  email: string,
  sessionId: string,
): Promise<void> {
  await clearCachedSetterAiMessages(email, sessionId);
}

export async function readDeletedSessionTombstones(
  email: string,
): Promise<Set<string>> {
  const deletedSessionIds = await getDeletedSetterAiSessionIds(email);
  return new Set(deletedSessionIds);
}

export async function persistDeletedSessionTombstone(
  email: string,
  sessionId: string,
): Promise<void> {
  await markDeletedSetterAiSessionId(email, sessionId);
}

export async function removeDeletedSessionTombstone(
  email: string,
  sessionId: string,
): Promise<void> {
  await unmarkDeletedSetterAiSessionId(email, sessionId);
}
