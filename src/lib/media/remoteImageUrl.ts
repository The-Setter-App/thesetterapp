function isDataOrBlobUrl(value: string): boolean {
  return value.startsWith("data:") || value.startsWith("blob:");
}

function isAppRelativeUrl(value: string): boolean {
  return value.startsWith("/");
}

function isRemoteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function shouldProxyRemoteImage(src: string | null | undefined): boolean {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  if (isDataOrBlobUrl(trimmed)) return false;
  if (isAppRelativeUrl(trimmed)) return false;
  return isRemoteHttpUrl(trimmed);
}

export function toExternalImageProxyUrl(src: string): string {
  return `/api/external-images?url=${encodeURIComponent(src)}`;
}

export function resolveAppImageSrc(
  src: string | null | undefined,
): string | null | undefined {
  if (!src) return src;
  return shouldProxyRemoteImage(src) ? toExternalImageProxyUrl(src) : src;
}
