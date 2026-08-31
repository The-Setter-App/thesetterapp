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

export interface StatusOption {
  name: string;
  description: string;
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

function parseStatusJson(
  content: string,
  validNames: Set<string>,
): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

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

  const status =
    parsed && typeof parsed === "object" && "status" in parsed
      ? (parsed as { status?: unknown }).status
      : null;
  if (typeof status !== "string" || !status) return null;

  // Defensive: only ever return a status we actually offered.
  return validNames.has(status) ? status : null;
}

/**
 * Classifies a conversation transcript against the workspace's own status
 * definitions (every status's description doubles as its AI matching
 * criteria - default statuses included, not just custom ones) and returns
 * the single best-matching status name, or null if none clearly apply.
 * Never throws for "no match" - callers handle upstream failures
 * separately since a bad classification pass shouldn't break message
 * delivery.
 */
export async function classifyConversationStatus(
  messages: Message[],
  statusOptions: StatusOption[],
): Promise<string | null> {
  if (statusOptions.length === 0) return null;

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
  if (!transcript.trim()) return null;

  const validNames = new Set(statusOptions.map((option) => option.name));
  const statusList = statusOptions
    .map((option) => `- "${option.name}": ${option.description}`)
    .join("\n");

  const promptMessages: NvidiaChatMessage[] = [
    {
      role: "system",
      content:
        "You classify Instagram DM sales conversations against a workspace's own pipeline statuses. Return strict JSON only. No markdown. Only use a status name from the list you are given, exactly as written - never invent one.",
    },
    {
      role: "user",
      content: [
        "Given this conversation transcript and these status definitions, pick the single status that best matches where this lead is right now. If none of them clearly apply based on the transcript, return null.",
        "",
        "Status definitions:",
        statusList,
        "",
        'Output schema: {"status": "<exact status name>" | null}',
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
      max_tokens: 200,
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
  return parseStatusJson(content, validNames);
}
