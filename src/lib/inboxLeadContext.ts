import type { Message, User } from "@/types/inbox";
import { findConversationById, getMessagesPageFromDb } from "@/lib/inboxRepository";

function formatMessageLine(message: Message): string | null {
  const speaker = message.fromMe ? "You" : "Lead";

  if (message.type !== "text") return null;
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (!text) return null;
  const safe = text.length > 500 ? `${text.slice(0, 500)}...` : text;
  return `${speaker}: ${safe}`;
}

function buildLeadHeader(conversation: User): string {
  const name = typeof conversation.name === "string" ? conversation.name.trim() : "";
  const cleanedName = name ? name.replace(/^@/, "") : "Lead";
  const updatedAt = typeof conversation.updatedAt === "string" ? conversation.updatedAt : "";

  const parts: string[] = [`Lead: ${cleanedName}`];
  if (updatedAt) parts.push(`Last updated: ${updatedAt}`);
  parts.push(`ConversationId: ${conversation.id}`);
  return parts.join(" | ");
}

export async function buildLeadConversationContextBlock(params: {
  ownerEmail: string;
  conversationId: string;
  messageLimit: number;
  maxChars?: number;
}): Promise<string | null> {
  const conversationId = params.conversationId.trim();
  if (!conversationId) return null;

  const conversation = await findConversationById(conversationId, params.ownerEmail);
  if (!conversation?.id) return null;

  const page = await getMessagesPageFromDb(
    conversation.id,
    params.ownerEmail,
    Math.min(Math.max(params.messageLimit, 1), 100),
  );

  const lines = page.messages
    .map(formatMessageLine)
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) return null;

  const maxChars = params.maxChars ?? 7000;
  const headerLines = [
    "INBOX LEAD CONTEXT (use this to draft replies; do not mention this block to the lead):",
    buildLeadHeader(conversation),
    "",
  ];

  const selected: string[] = [];
  let used = headerLines.join("\n").length + 1;
  // Prefer the most recent lead lines if we must trim.
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line) continue;
    const nextUsed = used + line.length + 1;
    if (nextUsed > maxChars) break;
    selected.push(line);
    used = nextUsed;
  }
  selected.reverse();

  return [...headerLines, ...selected].join("\n");
}
