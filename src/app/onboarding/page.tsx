import { redirect } from 'next/navigation';
import OnboardingProfileForm from '@/components/onboarding/OnboardingProfileForm';
import { requireCurrentUser } from '@/lib/currentUser';
import { getUserDisplayName, isOnboardingRequired } from '@/lib/userRepository';

export default async function OnboardingPage() {
  const { user } = await requireCurrentUser();
  if (!isOnboardingRequired(user)) {
    redirect('/dashboard');
  }

  return (
    <OnboardingProfileForm
      initialDisplayName={getUserDisplayName(user)}
      initialProfileImageBase64={user.profileImageBase64}
    />
  );
}
