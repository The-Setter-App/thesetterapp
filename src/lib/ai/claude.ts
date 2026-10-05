import Anthropic from "@anthropic-ai/sdk";

// Which model a job runs on. "writing" is for text a person will read or
// send; "fast" is for high-volume background jobs such as sorting leads.
export type AiModelTier = "writing" | "fast";

const DEFAULT_MODELS: Record<AiModelTier, string> = {
  writing: "claude-sonnet-5-5",
  fast: "claude-haiku-4-5-20251001",
};

// Setting either of these swaps the model without a code change.
const MODEL_ENV_NAMES: Record<AiModelTier, string> = {
  writing: "ANTHROPIC_MODEL",
  fast: "ANTHROPIC_FAST_MODEL",
};

const REQUEST_TIMEOUT_MS = 45_000;

// The AI provider is not set up on this deployment.
export class AiConfigurationError extends Error {}

// The AI provider did not give a usable answer.
export class AiUpstreamError extends Error {
  // The provider's HTTP status, or null when no response arrived at all.
  status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }

  // True when the provider turned the request away because of how this
  // deployment is set up: a bad or unauthorised key, or a model name it no
  // longer serves. Trying again cannot fix that; the settings have to change.
  get isSetupProblem(): boolean {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.status === 404 ||
      this.status === 410
    );
  }
}

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (client) return client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiConfigurationError("Missing ANTHROPIC_API_KEY.");
  }

  // The SDK retries rate limits and server errors twice on its own.
  client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS });
  return client;
}

export function getAiModel(tier: AiModelTier): string {
  return process.env[MODEL_ENV_NAMES[tier]]?.trim() || DEFAULT_MODELS[tier];
}

export function isAiAbortError(error: unknown): boolean {
  return error instanceof Anthropic.APIUserAbortError;
}

// Wraps whatever the SDK threw so callers deal with one error type. The
// message is for logs only and never includes the request body.
export function toAiUpstreamError(error: unknown): AiUpstreamError {
  if (error instanceof AiUpstreamError) return error;
  if (error instanceof Anthropic.APIError) {
    const status = typeof error.status === "number" ? error.status : null;
    return new AiUpstreamError(
      `AI request failed${status ? ` with ${status}` : ""}: ${error.message.slice(0, 300)}`,
      status,
    );
  }
  const reason = error instanceof Error ? error.name : "unknown";
  return new AiUpstreamError(`AI request did not complete (${reason}).`, null);
}
