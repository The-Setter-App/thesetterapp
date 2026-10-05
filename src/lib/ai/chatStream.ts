import type Anthropic from "@anthropic-ai/sdk";
import {
  type AiModelTier,
  getAiModel,
  getClaudeClient,
  toAiUpstreamError,
} from "@/lib/ai/claude";

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatStreamRequest {
  tier: AiModelTier;
  turns: ChatTurn[];
  maxTokens: number;
  // Aborting this stops the reply mid-stream, e.g. when the reader leaves.
  signal?: AbortSignal;
}

interface ChatRequestParts {
  system: string;
  messages: Anthropic.MessageParam[];
}

// The API takes instructions separately from the conversation, wants the
// conversation to open with the user, and rejects empty messages.
export function toChatRequestParts(turns: ChatTurn[]): ChatRequestParts {
  const system: string[] = [];
  const messages: Anthropic.MessageParam[] = [];

  for (const turn of turns) {
    const content = turn.content.trim();
    if (!content) continue;
    if (turn.role === "system") {
      system.push(content);
      continue;
    }
    // History trimmed to fit can begin with a reply; drop it.
    if (messages.length === 0 && turn.role === "assistant") continue;
    messages.push({ role: turn.role, content });
  }

  return { system: system.join("\n\n"), messages };
}

// Starts a chat reply and returns its text piece by piece. The promise
// rejects with AiConfigurationError or AiUpstreamError if the provider
// refuses the request, before any text has been produced.
export async function startChatStream({
  tier,
  turns,
  maxTokens,
  signal,
}: ChatStreamRequest): Promise<AsyncIterable<string>> {
  const client = getClaudeClient();
  const { system, messages } = toChatRequestParts(turns);

  let events: AsyncIterable<Anthropic.RawMessageStreamEvent>;
  try {
    events = await client.messages.create(
      {
        model: getAiModel(tier),
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages,
        stream: true,
      },
      { signal },
    );
  } catch (error) {
    throw toAiUpstreamError(error);
  }

  async function* readText(): AsyncGenerator<string> {
    for await (const event of events) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta" &&
        event.delta.text
      ) {
        yield event.delta.text;
      }
    }
  }

  return readText();
}
