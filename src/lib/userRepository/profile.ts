import {
  removeProfileImage,
  uploadProfileImageFromDataUrl,
} from "@/lib/profileImageStorage";
import { normalizeDisplayName } from "@/lib/profileValidation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@/types/auth";
import { getUser, getUserRow } from "./readers";
import { normalizeEmail, toIso } from "./shared";

interface UpdateUserProfileInput {
  displayName: string;
  profileImageBase64?: string | null;
  markOnboardingComplete?: boolean;
}

export async function updateUserProfileImage(
  email: string,
  profileImageBase64: string | null,
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = getSupabaseServerClient();

  const existingRow = await getUserRow(normalizedEmail);
  const previousPath = existingRow?.profile_image_path ?? null;
  let nextPath: string | null = previousPath;

  if (typeof profileImageBase64 === "string" && profileImageBase64.length > 0) {
    nextPath = await uploadProfileImageFromDataUrl(
      normalizedEmail,
      profileImageBase64,
    );
  } else if (profileImageBase64 === null) {
    nextPath = null;
  }

  const updates = {
    profile_image_base64: null as string | null,
    profile_image_path: nextPath,
    updated_at: toIso(new Date()),
  };

  const { error } = await supabase
    .from("app_users")
    .update(updates)
    .eq("email", normalizedEmail);
  if (error) {
    throw new Error(`Failed to update profile image: ${error.message}`);
  }

  if (previousPath && previousPath !== nextPath) {
    await removeProfileImage(previousPath);
  }

  const updatedUser = await getUser(normalizedEmail);
  if (!updatedUser) throw new Error("Failed to load updated user");
  return updatedUser;
}

export async function updateUserProfile(
  email: string,
  input: UpdateUserProfileInput,
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeDisplayName(input.displayName);
  if (!normalizedName) {
    throw new Error("Display name is required");
  }

  const supabase = getSupabaseServerClient();

  const updates: {
    display_name: string;
    updated_at: string;
    has_completed_onboarding?: boolean;
  } = {
    display_name: normalizedName,
    updated_at: toIso(new Date()),
  };

  if (input.markOnboardingComplete) {
    updates.has_completed_onboarding = true;
  }

  const { error } = await supabase
    .from("app_users")
    .update(updates)
    .eq("email", normalizedEmail);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  if (input.profileImageBase64 !== undefined) {
    await updateUserProfileImage(normalizedEmail, input.profileImageBase64);
  }

  const updatedUser = await getUser(normalizedEmail);
  if (!updatedUser) throw new Error("Failed to load updated user");
  return updatedUser;
}
