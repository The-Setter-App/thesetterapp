import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getCachedUser } from '@/lib/settingsCache';

export const requireCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await getCachedUser(session.email);
  if (!user) redirect('/login');

  return { session, user };
});
