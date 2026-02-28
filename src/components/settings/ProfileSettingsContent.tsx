"use client";

import { Camera, KeyRound, Mail, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
    <div className="max-w-5xl space-y-4">
      {success ? (
        <div className="rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <SettingsSectionCard
        title="Your account profile"
        description="Set your name and avatar used throughout the workspace."
      >
        <div className="px-6 py-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Preview
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border border-[#F0F2F6] bg-white">
                    <img
                      src={profileImageBase64 || "/images/no_profile.jpg"}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#101011]">
                      {normalizedDisplayName || "Your name"}
                    </p>
                    <p className="truncate text-xs text-[#606266]">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Account details
                </p>
                <div className="space-y-2">
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
                    <div className="mb-1 flex items-center gap-2 text-[#606266]">
                      <Mail size={14} />
                      <span className="text-xs font-medium">Email</span>
                    </div>
                    <p className="truncate font-mono text-xs text-[#101011]">
                      {user.email}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
                    <div className="mb-1 flex items-center gap-2 text-[#606266]">
                      <KeyRound size={14} />
                      <span className="text-xs font-medium">Role</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-1 text-xs capitalize text-[#8771FF]"
                    >
                      {roleLabel}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F0F2F6] bg-white p-4 md:p-5">
              <label
                htmlFor="display-name"
                className="mb-2 block text-sm font-medium text-[#101011]"
              >
                Account name
              </label>
              <input
                id="display-name"
                name="display-name"
                type="text"
                value={displayName}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Enter your name"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
              />
              <p className="mt-2 text-xs text-[#606266]">
                {normalizedDisplayName.length}/{MAX_DISPLAY_NAME_LENGTH}
              </p>

              <div className="mt-4 rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl"
                    leftIcon={<Camera size={16} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-[#F0F2F6]"
                    leftIcon={<Trash2 size={16} />}
                    onClick={() => setProfileImageBase64("")}
                  >
                    Remove
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[#606266]">
                  PNG/JPG up to{" "}
                  {Math.floor(MAX_PROFILE_IMAGE_BYTES / 1_000_000)}MB
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    hasUnsavedChanges
                      ? "border border-[#D8D2FF] bg-[#F3F0FF] text-[#6d5ed6]"
                      : "border border-[#F0F2F6] bg-[#F8F7FF] text-[#606266]"
                  }`}
                >
                  <span
                    className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${
                      hasUnsavedChanges ? "bg-[#8771FF]" : "bg-[#9A9CA2]"
                    }`}
                  />
                  {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                </div>
                <Button
                  type="button"
                  className="h-12 w-full rounded-xl md:w-auto"
                  disabled={!canSave}
                  isLoading={saving}
                  onClick={saveProfile}
                >
                  <User size={16} />
                  <span className="ml-2">Save profile</span>
                </Button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </SettingsSectionCard>
    </div>
  );
}
