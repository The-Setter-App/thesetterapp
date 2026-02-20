import type { Message, ConversationSummary, ConversationSummarySection } from '@/types/inbox';

interface NvidiaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface NvidiaChatChoice {
  message?: {
    content?: string;
  };
}

interface NvidiaChatCompletionResponse {
  choices?: NvidiaChatChoice[];
}

interface SummaryPayload {
  clientSnapshot?: {
    title?: string;
    points?: string[];
  };
  actionPlan?: {
    title?: string;
    points?: string[];
  };
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

function extractText(message: Message): string {
  if (message.type === 'text') {
    return message.text?.trim() || '';
  }
  if (message.type === 'audio') {
    return message.text?.trim() || '[Voice note]';
  }
  if (message.type === 'image') {
    return message.text?.trim() || '[Image]';
  }
  if (message.type === 'video') {
    return message.text?.trim() || '[Video]';
  }
  return message.text?.trim() || '[Attachment]';
}

function buildConversationTranscript(messages: Message[], maxChars: number): string {
  const lines = messages
    .filter((message) => !message.isEmpty)
    .map((message) => {
      const speaker = message.fromMe ? 'Setter' : 'Lead';
      const text = extractText(message);
      const timestamp = message.timestamp || '';
      return `${speaker}${timestamp ? ` (${timestamp})` : ''}: ${text}`;
    })
    .filter((line) => line.trim().length > 0);

  const joined = lines.join('\n');
  if (joined.length <= maxChars) return joined;
  return joined.slice(joined.length - maxChars);
}

function normalizeSection(
  value: { title?: string; points?: string[] } | undefined,
  fallbackTitle: string
): ConversationSummarySection {
  const title = value?.title?.trim() ? value.title.trim() : fallbackTitle;
  const points = Array.isArray(value?.points)
    ? value.points.map((point) => point.trim()).filter((point) => point.length > 0)
    : [];
  return {
    title,
    points: points.slice(0, 8),
  };
}

function normalizeSummary(payload: SummaryPayload): ConversationSummary {
  const clientSnapshot = normalizeSection(payload.clientSnapshot, 'Client Snapshot');
  const actionPlan = normalizeSection(payload.actionPlan, 'Action Plan');

  if (clientSnapshot.points.length === 0) {
    clientSnapshot.points = ['Not enough conversation context to generate a snapshot yet.'];
  }
  if (actionPlan.points.length === 0) {
    actionPlan.points = ['No clear next actions found. Ask a qualifying follow-up question in chat.'];
  }

  return { clientSnapshot, actionPlan };
}

function parseSummaryJson(content: string): SummaryPayload {
  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as SummaryPayload;
  } catch {
    const openIndex = trimmed.indexOf('{');
    const closeIndex = trimmed.lastIndexOf('}');
    if (openIndex >= 0 && closeIndex > openIndex) {
      const innerJson = trimmed.slice(openIndex, closeIndex + 1);
      try {
        return JSON.parse(innerJson) as SummaryPayload;
      } catch {
        return {};
      }
    }
    return {};
  }
}

export async function generateConversationSummary(messages: Message[]): Promise<ConversationSummary> {
  const baseUrl = process.env.NVIDIA_BASE_URL;
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL;
  const temperatureRaw = process.env.NVIDIA_TEMPERATURE;
  const maxTokensRaw = process.env.NVIDIA_MAX_TOKENS;

  if (!baseUrl || !apiKey || !model || !temperatureRaw || !maxTokensRaw) {
    throw new Error('Missing NVIDIA AI environment variables.');
  }

  const temperature = Number(temperatureRaw);
  const maxTokens = Number(maxTokensRaw);
  if (!Number.isFinite(temperature) || !Number.isFinite(maxTokens)) {
    throw new Error('Invalid NVIDIA AI numeric environment values.');
  }

  const transcript = buildConversationTranscript(messages, 11000);
  if (!transcript.trim()) {
    return normalizeSummary({});
  }

  const promptMessages: NvidiaChatMessage[] = [
    {
      role: 'system',
      content:
        'You summarize Instagram DM sales conversations for setter teams. Return strict JSON only. No markdown.',
    },
    {
      role: 'user',
      content: [
        'Create a concise, sales-usable summary of this conversation.',
        'Output schema:',
        '{"clientSnapshot":{"title":"Client Snapshot","points":["..."]},"actionPlan":{"title":"Action Plan","points":["..."]}}',
        'Rules:',
        '- 4 to 8 points per section.',
        '- Keep each point specific and action-oriented.',
        '- Do not invent facts that are not in the transcript.',
        '- If data is missing, state what is missing succinctly.',
        '',
        'Transcript:',
        transcript,
      ].join('\n'),
    },
  ];

  const upstream = await fetch(`${normalizeBaseUrl(baseUrl)}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: Math.min(Math.max(Math.floor(maxTokens), 300), 1200),
      stream: false,
      messages: promptMessages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!upstream.ok) {
    const details = await upstream.text().catch(() => '');
    throw new Error(`Upstream AI request failed: ${details.slice(0, 300)}`);
  }

  const data = (await upstream.json()) as NvidiaChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  const parsed = parseSummaryJson(content);

  return normalizeSummary(parsed);
}
