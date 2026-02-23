import { randomUUID } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_IMAGES_BUCKET = "profile-images";

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

export function resolveProfileImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalizedPath = normalizeObjectPath(path);
  const supabase = getSupabaseServerClient();
  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(normalizedPath);
  return data.publicUrl;
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
