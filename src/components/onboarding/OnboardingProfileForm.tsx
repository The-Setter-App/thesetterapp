'use client';

import { Camera, UserRound } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fileToOptimizedProfileDataUrl } from '@/lib/profileImage';
import {
  exceedsProfileImageSizeLimit,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PROFILE_IMAGE_BYTES,
  normalizeDisplayName,
} from '@/lib/profileValidation';

interface OnboardingProfileFormProps {
  initialDisplayName: string;
  initialProfileImageBase64?: string;
}

export default function OnboardingProfileForm({
  initialDisplayName,
  initialProfileImageBase64,
}: OnboardingProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [profileImageBase64, setProfileImageBase64] = useState(initialProfileImageBase64 ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isSubmitDisabled = useMemo(
    () => normalizeDisplayName(displayName).length === 0 || saving || uploadingImage,
    [displayName, saving, uploadingImage]
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const inputElement = event.currentTarget;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setError('');
    setUploadingImage(true);
    try {
      const dataUrl = await fileToOptimizedProfileDataUrl(file);
      if (!dataUrl || exceedsProfileImageSizeLimit(dataUrl)) {
        setError(`Profile image must be smaller than ${Math.floor(MAX_PROFILE_IMAGE_BYTES / 1_000_000)}MB`);
        return;
      }

      const response = await fetch('/api/profile/image', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileImageBase64: dataUrl,
        }),
      });
      const payload = (await response.json()) as { error?: string; user?: { profileImageBase64?: string | null } };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to upload image');
      }

      setProfileImageBase64(payload.user?.profileImageBase64 ?? dataUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      inputElement.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const normalizedName = normalizeDisplayName(displayName);
    if (!normalizedName) {
      setError('Name is required');
      return;
    }

    if (normalizedName.length > MAX_DISPLAY_NAME_LENGTH) {
      setError(`Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: normalizedName,
          markOnboardingComplete: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save profile');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7FF_50%,#FFFFFF_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl items-center justify-center">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-3xl border border-[#F0F2F6] bg-white shadow-sm lg:grid-cols-[1.1fr_0.9fr]">
          <section className="bg-[#F8F7FF] p-6 md:p-10">
            <div className="inline-flex items-center rounded-full bg-[rgba(135,113,255,0.1)] px-3 py-1 text-xs font-semibold text-[#8771FF]">
              First-time setup
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#101011] md:text-3xl">Set up your profile</h1>
            <p className="mt-3 text-sm text-[#606266] md:text-base">
              Add your account name and profile image. We&apos;ll use this in your sidebar and dashboard.
            </p>

            <div className="mt-8 rounded-2xl border border-[#F0F2F6] bg-white p-5">
              <p className="text-sm font-semibold text-[#101011]">Preview</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full border border-[#F0F2F6] bg-[#F8F7FF]">
                  <img
                    src={profileImageBase64 || '/images/no_profile.jpg'}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#101011]">{normalizeDisplayName(displayName) || 'Your name'}</p>
                  <p className="text-xs text-[#606266]">Shown across your workspace</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-[#101011]">
                  Account name
                </label>
                <Input
                  id="profile-name"
                  value={displayName}
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Enter your name"
                  className="h-12 border-[#F0F2F6] bg-white text-[#101011] placeholder:text-[#9A9CA2] focus:ring-0"
                />
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium text-[#101011]">Profile image</p>
                <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-[#F0F2F6] bg-white">
                      <img
                        src={profileImageBase64 || '/images/no_profile.jpg'}
                        alt="Current profile"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-11 w-full rounded-xl"
                        leftIcon={<Camera size={16} />}
                        disabled={uploadingImage}
                        isLoading={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingImage ? 'Uploading image...' : 'Upload image'}
                      </Button>
                      <p className="text-xs text-[#606266]">PNG/JPG up to {Math.floor(MAX_PROFILE_IMAGE_BYTES / 1_000_000)}MB</p>
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

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              ) : null}

              <Button type="submit" className="h-12 w-full rounded-xl" disabled={isSubmitDisabled} isLoading={saving}>
                Save and continue
              </Button>
              <p className="flex items-center justify-center gap-2 text-xs text-[#606266]">
                <UserRound size={14} />
                You can edit this later in Settings &gt; Profile
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
