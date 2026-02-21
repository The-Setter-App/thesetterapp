import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { exceedsProfileImageSizeLimit, isValidProfileImageDataUrl } from '@/lib/profileValidation';
import { revalidateSettingsUserCache } from '@/lib/settingsCache';
import { updateUserProfileImage } from '@/lib/userRepository';

interface UpdateProfileImageBody {
  profileImageBase64?: unknown;
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as UpdateProfileImageBody;
    if (typeof body.profileImageBase64 !== 'string') {
      return NextResponse.json({ error: 'Profile image is required' }, { status: 400 });
    }

    if (!isValidProfileImageDataUrl(body.profileImageBase64)) {
      return NextResponse.json({ error: 'Invalid profile image format' }, { status: 400 });
    }
    if (exceedsProfileImageSizeLimit(body.profileImageBase64)) {
      return NextResponse.json({ error: 'Profile image is too large' }, { status: 400 });
    }

    const user = await updateUserProfileImage(session.email, body.profileImageBase64);
    revalidateSettingsUserCache();

    return NextResponse.json({
      success: true,
      user: {
        profileImageBase64: user.profileImageBase64 ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to update profile image', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

