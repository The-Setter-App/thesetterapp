import { toNvidiaChatCompletionsUrl } from "@/lib/nvidiaBaseUrl";

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export interface JsonChatCompletionOptions {
  maxTokens: number;
  // Falls back to the workspace-wide NVIDIA_TEMPERATURE setting.
  temperature?: number;
  timeoutMs?: number;
}

// The AI provider is not set up on this deployment.
export class AiConfigurationError extends Error {}

// The AI provider was reached but did not give a usable answer.
export class AiUpstreamError extends Error {}

const DEFAULT_TIMEOUT_MS = 30_000;

interface AiSettings {
  url: string;
  apiKey: string;
  model: string;
  temperature: number;
}

function readAiSettings(): AiSettings {
  const baseUrl = process.env.NVIDIA_BASE_URL;
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL;
  if (!baseUrl || !apiKey || !model) {
    throw new AiConfigurationError("Missing NVIDIA AI environment variables.");
  }

  const temperature = Number(process.env.NVIDIA_TEMPERATURE);
  return {
    url: toNvidiaChatCompletionsUrl(baseUrl),
    apiKey,
    model,
    temperature: Number.isFinite(temperature) ? temperature : 0.5,
  };
}

// Models sometimes wrap the object in prose or a code fence, so when the
// whole answer is not JSON the outermost braces are tried on their own.
function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

// Asks the model for a JSON object and returns it parsed, or null when the
// answer was not JSON. The shape is not checked here: callers narrow it.
export async function requestJsonChatCompletion(
  messages: ChatCompletionMessage[],
  options: JsonChatCompletionOptions,
): Promise<unknown> {
  const settings = readAiSettings();

  let upstream: Response;
  try {
    upstream = await fetch(settings.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: options.temperature ?? settings.temperature,
        max_tokens: options.maxTokens,
        stream: false,
        messages,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.name : "unknown";
    throw new AiUpstreamError(`AI request did not complete (${reason}).`);
  }

  if (!upstream.ok) {
    const details = await upstream.text().catch(() => "");
    throw new AiUpstreamError(
      `AI request failed with ${upstream.status}: ${details.slice(0, 300)}`,
    );
  }

  const data: ChatCompletionResponse | null = await upstream
    .json()
    .catch(() => null);
  return parseJsonObject(data?.choices?.[0]?.message?.content ?? "");
}
