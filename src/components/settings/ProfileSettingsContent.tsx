"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_HINT_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import { AppImage } from "@/components/ui/AppImage";
import { fileToOptimizedProfileDataUrl } from "@/lib/profileImage";
import {
  exceedsProfileImageSizeLimit,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PROFILE_IMAGE_BYTES,
  normalizeDisplayName,
} from "@/lib/profileValidation";
import type { User as AppUser } from "@/types/auth";

export default function ProfileSettingsContent({ user }: { user: AppUser }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [profileImageBase64, setProfileImageBase64] = useState(
    user.profileImageBase64 ?? "",
  );
  const [savedDisplayName, setSavedDisplayName] = useState(
    normalizeDisplayName(user.displayName ?? ""),
  );
  const [savedProfileImageBase64, setSavedProfileImageBase64] = useState(
    user.profileImageBase64 ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const normalizedDisplayName = useMemo(
    () => normalizeDisplayName(displayName),
    [displayName],
  );
  const hasUnsavedChanges =
    normalizedDisplayName !== savedDisplayName ||
    profileImageBase64 !== savedProfileImageBase64;
  const canSave =
    normalizedDisplayName.length > 0 && !saving && hasUnsavedChanges;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }

    try {
      const dataUrl = await fileToOptimizedProfileDataUrl(file);
      if (!dataUrl || exceedsProfileImageSizeLimit(dataUrl)) {
        setError(
          `Profile image must be smaller than ${Math.floor(MAX_PROFILE_IMAGE_BYTES / 1_000_000)}MB`,
        );
        return;
      }
      setError("");
      setSuccess("");
      setProfileImageBase64(dataUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image",
      );
    } finally {
      inputElement.value = "";
    }
  }

  async function saveProfile() {
    setError("");
    setSuccess("");

    if (!normalizedDisplayName) {
      setError("Name is required");
      return;
    }
    if (normalizedDisplayName.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(`Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`);
      return;
    }

    setSaving(true);
    try {
      const profileImagePayload =
        profileImageBase64.length === 0
          ? null
          : profileImageBase64.startsWith("data:image/")
            ? profileImageBase64
            : undefined;

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: normalizedDisplayName,
          profileImageBase64: profileImagePayload,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update profile");
      }
      setSavedDisplayName(normalizedDisplayName);
      setSavedProfileImageBase64(profileImageBase64 || "");
      setSuccess("Profile updated successfully.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {success ? (
        <SettingsNotice tone="success">{success}</SettingsNotice>
      ) : null}
      {error ? <SettingsNotice tone="error">{error}</SettingsNotice> : null}

      <SettingsSectionCard
        title="Your profile"
        description="Your name and picture, shown to your team across the workspace."
      >
        <div
          className={`${SETTINGS_BLOCK_CLASS} flex flex-col gap-4 border-b border-[#F0F2F6] sm:flex-row sm:items-center`}
        >
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#F4F5F8]">
            <AppImage
              src={profileImageBase64 || "/images/no_profile.jpg"}
              alt="Your profile picture"
              className="h-full w-full object-cover"
              loadingMode="eager"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={SETTINGS_SECONDARY_BUTTON_CLASS}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={15} aria-hidden="true" />
                Upload picture
              </button>
              {profileImageBase64 ? (
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-600"
                  onClick={() => setProfileImageBase64("")}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </button>
              ) : null}
            </div>
            <p className={SETTINGS_HINT_CLASS}>
              PNG or JPG, up to{" "}
              {Math.floor(MAX_PROFILE_IMAGE_BYTES / 1_000_000)}MB.
            </p>
          </div>
        </div>

        <div className={`${SETTINGS_BLOCK_CLASS} border-b border-[#F0F2F6]`}>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="display-name" className={SETTINGS_LABEL_CLASS}>
              Name
            </label>
            <span className="text-xs text-[#9A9CA2] tabular-nums">
              {normalizedDisplayName.length}/{MAX_DISPLAY_NAME_LENGTH}
            </span>
          </div>
          <input
            id="display-name"
            name="display-name"
            type="text"
            value={displayName}
            maxLength={MAX_DISPLAY_NAME_LENGTH}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Enter your name"
            className={`${SETTINGS_INPUT_CLASS} max-w-md`}
          />
        </div>

        <dl className="divide-y divide-[#F0F2F6] border-b border-[#F0F2F6]">
          <div
            className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-4 !py-3.5`}
          >
            <dt className="text-sm text-[#606266]">Email</dt>
            <dd className="min-w-0 truncate text-sm font-medium text-[#101011]">
              {user.email}
            </dd>
          </div>
          <div
            className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-4 !py-3.5`}
          >
            <dt className="text-sm text-[#606266]">Role</dt>
            <dd>
              <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF]">
                {roleLabel}
              </span>
            </dd>
          </div>
        </dl>

        <div
          className={`${SETTINGS_BLOCK_CLASS} flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p
            className={`inline-flex items-center gap-2 text-[0.8125rem] font-medium ${
              hasUnsavedChanges ? "text-[#8771FF]" : "text-[#9A9CA2]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                hasUnsavedChanges ? "bg-[#8771FF]" : "bg-[#C4C6CC]"
              }`}
            />
            {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
          </p>
          <button
            type="button"
            className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            disabled={!canSave}
            onClick={saveProfile}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </SettingsSectionCard>
    </div>
  );
}
