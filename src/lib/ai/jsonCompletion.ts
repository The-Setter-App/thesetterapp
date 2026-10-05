import {
  type AiModelTier,
  getAiModel,
  getClaudeClient,
  toAiUpstreamError,
} from "@/lib/ai/claude";

export interface JsonCompletionRequest {
  tier: AiModelTier;
  // Standing instructions: the role and the rule that the answer is JSON.
  system: string;
  // The task itself, including the output schema and the material to read.
  prompt: string;
  maxTokens: number;
}

// The model is told to answer with JSON only, but may still wrap it in a
// sentence or a code fence, so when the whole answer does not parse the
// outermost braces are tried on their own.
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
// Throws AiConfigurationError or AiUpstreamError when no answer came back.
export async function requestJsonCompletion({
  tier,
  system,
  prompt,
  maxTokens,
}: JsonCompletionRequest): Promise<unknown> {
  const client = getClaudeClient();

  try {
    const message = await client.messages.create({
      model: getAiModel(tier),
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");
    return parseJsonObject(text);
  } catch (error) {
    throw toAiUpstreamError(error);
  }
}
