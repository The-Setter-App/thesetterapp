import { revalidateTag, unstable_cache } from 'next/cache';
import { getConnectedInstagramAccounts, getTeamMembersForOwner, getUser } from '@/lib/userRepository';

const SETTINGS_CACHE_TTL_SECONDS = 10;
const SETTINGS_USER_CACHE_TAG = 'settings-user-v1';
const SETTINGS_CONNECTED_ACCOUNTS_CACHE_TAG = 'settings-connected-accounts-v1';
const SETTINGS_TEAM_MEMBERS_CACHE_TAG = 'settings-team-members-v1';

const getCachedUserInternal = unstable_cache(
  async (email: string) => getUser(email),
  [SETTINGS_USER_CACHE_TAG],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS, tags: [SETTINGS_USER_CACHE_TAG] }
);

const getCachedConnectedInstagramAccountsInternal = unstable_cache(
  async (email: string) => getConnectedInstagramAccounts(email),
  [SETTINGS_CONNECTED_ACCOUNTS_CACHE_TAG],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS, tags: [SETTINGS_CONNECTED_ACCOUNTS_CACHE_TAG] }
);

const getCachedTeamMembersForOwnerInternal = unstable_cache(
  async (ownerEmail: string) => getTeamMembersForOwner(ownerEmail),
  [SETTINGS_TEAM_MEMBERS_CACHE_TAG],
  { revalidate: SETTINGS_CACHE_TTL_SECONDS, tags: [SETTINGS_TEAM_MEMBERS_CACHE_TAG] }
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

export function revalidateSettingsUserCache() {
  revalidateTag(SETTINGS_USER_CACHE_TAG, { expire: 0 });
}
