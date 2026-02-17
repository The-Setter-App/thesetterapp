import { unstable_cache } from 'next/cache';
import { getConnectedInstagramAccounts, getTeamMembersForOwner, getUser } from '@/lib/userRepository';

const SETTINGS_CACHE_TTL_SECONDS = 10;

const getCachedUserInternal = unstable_cache(
  async (email: string) => getUser(email),
  ['settings-user-v1'],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS }
);

const getCachedConnectedInstagramAccountsInternal = unstable_cache(
  async (email: string) => getConnectedInstagramAccounts(email),
  ['settings-connected-accounts-v1'],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS }
);

const getCachedTeamMembersForOwnerInternal = unstable_cache(
  async (ownerEmail: string) => getTeamMembersForOwner(ownerEmail),
  ['settings-team-members-v1'],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS }
);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getCachedUser(email: string) {
  return getCachedUserInternal(normalizeEmail(email));
}

export async function getCachedConnectedInstagramAccounts(email: string) {
  return getCachedConnectedInstagramAccountsInternal(normalizeEmail(email));
}

export async function getCachedTeamMembersForOwner(ownerEmail: string) {
  return getCachedTeamMembersForOwnerInternal(normalizeEmail(ownerEmail));
}
