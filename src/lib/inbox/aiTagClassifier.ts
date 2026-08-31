import { toNvidiaChatCompletionsUrl } from "@/lib/nvidiaBaseUrl";
import type { Message } from "@/types/inbox";

interface NvidiaChatMessage {
  role: "system" | "user";
  content: string;
}

interface NvidiaChatChoice {
  message?: { content?: string };
}

interface NvidiaChatCompletionResponse {
  choices?: NvidiaChatChoice[];
}

export interface AiTagDefinition {
  id: string;
  name: string;
  criteria: string;
}

function extractText(message: Message): string {
  if (message.type === "text") return message.text?.trim() || "";
  if (message.type === "audio") return message.text?.trim() || "[Voice note]";
  if (message.type === "image") return message.text?.trim() || "[Image]";
  if (message.type === "video") return message.text?.trim() || "[Video]";
  return message.text?.trim() || "[Attachment]";
}

function buildConversationTranscript(
  messages: Message[],
  maxChars: number,
): string {
  const lines = messages
    .filter((message) => !message.isEmpty)
    .map((message) => {
      const speaker = message.fromMe ? "Setter" : "Lead";
      return `${speaker}: ${extractText(message)}`;
    })
    .filter((line) => line.trim().length > 0);

  const joined = lines.join("\n");
  if (joined.length <= maxChars) return joined;
  return joined.slice(joined.length - maxChars);
}

function parseTagIdsJson(content: string, validIds: Set<string>): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  const tryParse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(trimmed);
  if (!parsed) {
    const openIndex = trimmed.indexOf("{");
    const closeIndex = trimmed.lastIndexOf("}");
    if (openIndex >= 0 && closeIndex > openIndex) {
      parsed = tryParse(trimmed.slice(openIndex, closeIndex + 1));
    }
  }

  const rawIds =
    parsed && typeof parsed === "object" && "tagIds" in parsed
      ? (parsed as { tagIds?: unknown }).tagIds
      : null;
  if (!Array.isArray(rawIds)) return [];

  // Defensive filter: only ever return ids we actually gave the model.
  return rawIds.filter(
    (id): id is string => typeof id === "string" && validIds.has(id),
  );
}

/**
 * Classifies a conversation transcript against the workspace's AI tag
 * definitions and returns the subset of tag ids that apply. Returns []
 * (never throws for "no match") - callers should still handle upstream
 * failures since a bad classification pass shouldn't break message
 * delivery.
 */
export async function classifyConversationAiTags(
  messages: Message[],
  tagDefinitions: AiTagDefinition[],
): Promise<string[]> {
  if (tagDefinitions.length === 0) return [];

  const baseUrl = process.env.NVIDIA_BASE_URL;
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL;
  const temperatureRaw = process.env.NVIDIA_TEMPERATURE;
  const maxTokensRaw = process.env.NVIDIA_MAX_TOKENS;

  if (!baseUrl || !apiKey || !model || !temperatureRaw || !maxTokensRaw) {
    throw new Error("Missing NVIDIA AI environment variables.");
  }

  const temperature = Number(temperatureRaw);
  if (!Number.isFinite(temperature)) {
    throw new Error("Invalid NVIDIA AI numeric environment values.");
  }

  const transcript = buildConversationTranscript(messages, 8000);
  if (!transcript.trim()) return [];

  const validIds = new Set(tagDefinitions.map((tag) => tag.id));
  const tagList = tagDefinitions
    .map((tag) => `- id="${tag.id}" name="${tag.name}": ${tag.criteria}`)
    .join("\n");

  const promptMessages: NvidiaChatMessage[] = [
    {
      role: "system",
      content:
        "You classify Instagram DM sales conversations against a workspace's own tag definitions. Return strict JSON only. No markdown. Only use ids from the list you are given - never invent one.",
    },
    {
      role: "user",
      content: [
        "Given this conversation transcript and these tag definitions, return every tag id that applies. A conversation can match zero, one, or multiple tags.",
        "",
        "Tag definitions:",
        tagList,
        "",
        'Output schema: {"tagIds":["<id>", "..."]}',
        "",
        "Transcript:",
        transcript,
      ].join("\n"),
    },
  ];

  const upstream = await fetch(toNvidiaChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: 300,
      stream: false,
      messages: promptMessages,
      response_format: { type: "json_object" },
    }),
  });

  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "");
    throw new Error(`Upstream AI request failed: ${details.slice(0, 300)}`);
  }

  const data = (await upstream.json()) as NvidiaChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim() || "";
  return parseTagIdsJson(content, validIds);
}
