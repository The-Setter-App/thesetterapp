import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  exceedsProfileImageSizeLimit,
  isValidProfileImageDataUrl,
  MAX_DISPLAY_NAME_LENGTH,
  normalizeDisplayName,
} from '@/lib/profileValidation';
import { revalidateSettingsUserCache } from '@/lib/settingsCache';
import { updateUserProfile } from '@/lib/userRepository';

interface UpdateProfileBody {
  displayName?: unknown;
  profileImageBase64?: unknown;
  markOnboardingComplete?: unknown;
}

function parseBoolean(value: unknown): boolean {
  return value === true;
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateProfileBody;
    const displayName = typeof body.displayName === 'string' ? normalizeDisplayName(body.displayName) : '';
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }
    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    let profileImageBase64: string | null | undefined;
    if (typeof body.profileImageBase64 === 'string') {
      if (!isValidProfileImageDataUrl(body.profileImageBase64)) {
        return NextResponse.json({ error: 'Invalid profile image format' }, { status: 400 });
      }
      if (exceedsProfileImageSizeLimit(body.profileImageBase64)) {
        return NextResponse.json({ error: 'Profile image is too large' }, { status: 400 });
      }
      profileImageBase64 = body.profileImageBase64;
    } else if (body.profileImageBase64 === null) {
      profileImageBase64 = null;
    }

    const user = await updateUserProfile(session.email, {
      displayName,
      profileImageBase64,
      markOnboardingComplete: parseBoolean(body.markOnboardingComplete),
    });

    revalidateSettingsUserCache();

    return NextResponse.json({
      success: true,
      user: {
        displayName: user.displayName ?? displayName,
        profileImageBase64: user.profileImageBase64 ?? null,
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? true,
      },
    });
  } catch (error) {
    console.error('Failed to update profile', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
