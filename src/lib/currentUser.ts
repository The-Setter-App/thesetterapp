import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUser } from '@/lib/userRepository';

export const requireCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await getUser(session.email);
  if (!user) redirect('/login');

  return { session, user };
});
