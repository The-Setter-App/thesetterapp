import type { Message } from "@/types/inbox";

const MARKDOWN_LINK_PATTERN =
  /\[[^\]]+\]\((https?:\/\/[^)\s]+|www\.[^)\s]+)\)/gi;
const RAW_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;

type MessageTextSource =
  | Pick<Message, "text">
  | {
      text?: string | null;
      message?: string | null;
      body?: string | null;
      content?: string | null;
    }
  | null
  | undefined;

function readFirstString(values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (value.length === 0) continue;
    return value;
  }
  return "";
}

export function extractMessageText(source: MessageTextSource): string {
  if (!source) return "";

  return readFirstString([
    source.text,
    "message" in source ? source.message : undefined,
    "body" in source ? source.body : undefined,
    "content" in source ? source.content : undefined,
  ]);
}

export function countLinksInMessageText(text: string): number {
  if (!text) return 0;

  let matchCount = 0;
  const markdownStripped = text.replace(MARKDOWN_LINK_PATTERN, (match) => {
    matchCount += 1;
    return " ".repeat(match.length);
  });

  const rawMatches = markdownStripped.match(RAW_URL_PATTERN);
  return matchCount + (rawMatches?.length ?? 0);
}

export function normalizeExternalHref(
  href: string | undefined,
): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }
  if (href.startsWith("www.")) {
    return `https://${href}`;
  }
  return undefined;
}
