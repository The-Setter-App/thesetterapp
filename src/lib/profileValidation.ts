export const MAX_DISPLAY_NAME_LENGTH = 60;
export const MAX_PROFILE_IMAGE_BYTES = 1_000_000;
const PROFILE_IMAGE_DATA_URL_PREFIX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

function estimateBase64Bytes(value: string): number {
  const cleaned = value.replace(/=+$/, "");
  return Math.floor((cleaned.length * 3) / 4);
}

export function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidProfileImageDataUrl(value: string): boolean {
  if (!PROFILE_IMAGE_DATA_URL_PREFIX.test(value)) return false;
  const [, payload = ""] = value.split(",", 2);
  if (!payload) return false;
  return /^[A-Za-z0-9+/=]+$/.test(payload);
}

export function exceedsProfileImageSizeLimit(value: string): boolean {
  const [, payload = ""] = value.split(",", 2);
  if (!payload) return false;
  return estimateBase64Bytes(payload) > MAX_PROFILE_IMAGE_BYTES;
}
