import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_IMAGES_BUCKET = "profile-images";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

function normalizeObjectPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "img";
}

function parseImageDataUrl(dataUrl: string): { mimeType: string; bytes: Buffer } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid profile image data URL");
  }

  const mimeType = match[1];
  const base64Payload = match[2];
  const bytes = Buffer.from(base64Payload, "base64");
  return { mimeType, bytes };
}

function getSignedUrlTtlSeconds(): number {
  const raw = process.env.PROFILE_IMAGE_SIGNED_URL_TTL_SECONDS;
  if (!raw) return DEFAULT_SIGNED_URL_TTL_SECONDS;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SIGNED_URL_TTL_SECONDS;
  }
  return parsed;
}

export async function resolveProfileImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const normalizedPath = normalizeObjectPath(path);
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .createSignedUrl(normalizedPath, getSignedUrlTtlSeconds());
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

export async function uploadProfileImageFromDataUrl(email: string, dataUrl: string): Promise<string> {
  const { mimeType, bytes } = parseImageDataUrl(dataUrl);
  const extension = extensionForMimeType(mimeType);
  const objectPath = `${email}/${randomUUID()}.${extension}`;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(objectPath, bytes, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }

  return objectPath;
}

export async function removeProfileImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  const normalizedPath = normalizeObjectPath(path);
  const supabase = getSupabaseServerClient();
  if (normalizedPath === path) {
    await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove([path]);
    return;
  }
  await supabase.storage.from(PROFILE_IMAGES_BUCKET).remove([path, normalizedPath]);
}
