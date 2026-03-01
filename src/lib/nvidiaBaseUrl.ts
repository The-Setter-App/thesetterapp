function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function ensureV1Suffix(raw: string): string {
  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    if (!pathname) {
      parsed.pathname = "/v1";
      return normalizeBaseUrl(parsed.toString());
    }
    if (!pathname.endsWith("/v1")) {
      parsed.pathname = `${pathname}/v1`;
      return normalizeBaseUrl(parsed.toString());
    }
    return normalizeBaseUrl(parsed.toString());
  } catch {
    return raw.endsWith("/v1") ? raw : `${raw}/v1`;
  }
}

export function toNvidiaBaseUrlCandidates(primary: string, extras: string[] = []): string[] {
  const rawCandidates = [primary, ...extras];
  const unique: string[] = [];

  for (const raw of rawCandidates) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const normalized = normalizeBaseUrl(trimmed);
    const withV1 = ensureV1Suffix(normalized);

    for (const candidate of [normalized, withV1]) {
      if (!unique.includes(candidate)) {
        unique.push(candidate);
      }
    }
  }

  return unique;
}

export function toNvidiaChatCompletionsUrl(baseUrl: string): string {
  return `${ensureV1Suffix(normalizeBaseUrl(baseUrl))}/chat/completions`;
}

