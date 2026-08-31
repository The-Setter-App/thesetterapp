"use client";

export interface AiTagCatalogEntry {
  id: string;
  name: string;
  colorHex: string;
}

interface AiTagsResponse {
  aiTags?: Array<{ id: string; name: string; colorHex: string }>;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedEntries: AiTagCatalogEntry[] | null = null;
let cachedAt = 0;
let inFlight: Promise<AiTagCatalogEntry[]> | null = null;

async function fetchAiTagsCatalog(): Promise<AiTagCatalogEntry[]> {
  const response = await fetch("/api/settings/ai-tags", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load AI tags.");
  }
  const payload = (await response.json()) as AiTagsResponse;
  const entries = Array.isArray(payload.aiTags)
    ? payload.aiTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        colorHex: tag.colorHex,
      }))
    : [];
  cachedEntries = entries;
  cachedAt = Date.now();
  return entries;
}

export async function loadInboxAiTagsCatalog(): Promise<AiTagCatalogEntry[]> {
  if (cachedEntries && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedEntries;
  }
  if (inFlight) return inFlight;

  inFlight = fetchAiTagsCatalog().finally(() => {
    inFlight = null;
  });

  try {
    return await inFlight;
  } catch {
    if (cachedEntries) return cachedEntries;
    return [];
  }
}

export function buildAiTagLookup(
  entries: AiTagCatalogEntry[],
): Record<string, AiTagCatalogEntry> {
  const lookup: Record<string, AiTagCatalogEntry> = {};
  for (const entry of entries) {
    lookup[entry.id] = entry;
  }
  return lookup;
}
