import clientPromise from '@/lib/mongodb';
import { randomUUID } from 'crypto';
import {
  type InstagramAccountConnection,
  type InstagramConfig,
  type OTPRecord,
  type TeamMember,
  type TeamMemberRole,
  type User,
} from '@/types/auth';

const DB_NAME = 'thesetterapp';
const USERS_COLLECTION = 'users';
const OTP_COLLECTION = 'otps';
let userIndexesReady = false;

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isTeamMemberRole(value: unknown): value is TeamMemberRole {
  return value === 'setter' || value === 'closer';
}

function normalizeTeamMember(member: Partial<TeamMember>): TeamMember | null {
  const email = typeof member.email === 'string' ? normalizeEmail(member.email) : '';
  if (!email || !isTeamMemberRole(member.role)) return null;

  const now = new Date();
  return {
    email,
    role: member.role,
    addedAt: toDate(member.addedAt, now),
    updatedAt: toDate(member.updatedAt, now),
  };
}

function getTeamMembersFromUser(user: User | null): TeamMember[] {
  if (!user || !Array.isArray(user.teamMembers)) return [];

  const dedupedByEmail = new Map<string, TeamMember>();
  for (const raw of user.teamMembers) {
    const normalized = normalizeTeamMember(raw);
    if (!normalized) continue;
    dedupedByEmail.set(normalized.email, normalized);
  }
  return Array.from(dedupedByEmail.values());
}

function normalizeAccount(account: Partial<InstagramAccountConnection>): InstagramAccountConnection {
  const now = new Date();
  return {
    accountId: account.accountId || randomUUID(),
    accessToken: account.accessToken || '',
    pageId: account.pageId || '',
    instagramUserId: account.instagramUserId || '',
    graphVersion: account.graphVersion || 'v24.0',
    isConnected: account.isConnected ?? true,
    connectedAt: toDate(account.connectedAt, now),
    updatedAt: toDate(account.updatedAt, now),
    pageName: account.pageName,
    instagramUsername: account.instagramUsername,
  };
}

function legacyConfigToAccount(config?: InstagramConfig): InstagramAccountConnection[] {
  if (!config?.isConnected || !config.pageId || !config.instagramUserId || !config.accessToken) return [];
  const now = new Date();
  return [
    {
      accountId: randomUUID(),
      accessToken: config.accessToken,
      pageId: config.pageId,
      instagramUserId: config.instagramUserId,
      graphVersion: config.graphVersion || 'v24.0',
      isConnected: true,
      connectedAt: toDate(config.updatedAt, now),
      updatedAt: toDate(config.updatedAt, now),
    },
  ];
}

function getAccountsFromUser(user: User | null): InstagramAccountConnection[] {
  if (!user) return [];
  if (Array.isArray(user.instagramAccounts) && user.instagramAccounts.length > 0) {
    return user.instagramAccounts.map((a) => normalizeAccount(a));
  }
  return legacyConfigToAccount(user.instagramConfig);
}

function toLegacyConfig(account: InstagramAccountConnection): InstagramConfig {
  return {
    accessToken: account.accessToken,
    pageId: account.pageId,
    instagramUserId: account.instagramUserId,
    graphVersion: account.graphVersion,
    isConnected: account.isConnected,
    updatedAt: account.updatedAt,
  };
}

function sanitizeUser(raw: User | null): User | null {
  if (!raw) return null;

  const user = { ...raw };
  user.email = normalizeEmail(user.email);

  if (user.teamOwnerEmail) {
    user.teamOwnerEmail = normalizeEmail(user.teamOwnerEmail);
  }

  if (user.role !== 'owner' && user.role !== 'viewer' && user.role !== 'setter' && user.role !== 'closer') {
    user.role = 'viewer';
  }

  if (user.role !== 'owner') {
    user.teamMembers = [];
  } else {
    user.teamOwnerEmail = undefined;
    user.teamMembers = getTeamMembersFromUser(user);
  }

  return user;
}

async function ensureUserIndexes(db: any): Promise<void> {
  if (userIndexesReady) return;
  await Promise.allSettled([
    db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true }),
    db.collection(USERS_COLLECTION).createIndex({ role: 1 }),
    db.collection(USERS_COLLECTION).createIndex({ teamOwnerEmail: 1 }),
    db.collection(USERS_COLLECTION).createIndex({ 'teamMembers.email': 1 }),
    db.collection(USERS_COLLECTION).createIndex({ 'instagramAccounts.accountId': 1 }),
    db.collection(USERS_COLLECTION).createIndex({ 'instagramAccounts.instagramUserId': 1 }),
  ]);
  userIndexesReady = true;
}

async function findOwnerMembership(
  db: any,
  memberEmail: string,
  preferredOwnerEmail?: string
): Promise<{ ownerEmail: string; role: TeamMemberRole } | null> {
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (preferredOwnerEmail) {
    const normalizedPreferredOwner = normalizeEmail(preferredOwnerEmail);
    const preferredOwner = sanitizeUser(
      (await db.collection(USERS_COLLECTION).findOne({
        email: normalizedPreferredOwner,
        role: 'owner',
        'teamMembers.email': normalizedMemberEmail,
      })) as User | null
    );

    if (preferredOwner) {
      const member = getTeamMembersFromUser(preferredOwner).find((m) => m.email === normalizedMemberEmail);
      if (member) {
        return {
          ownerEmail: normalizedPreferredOwner,
          role: member.role,
        };
      }
    }
  }

  const owner = sanitizeUser(
    (await db.collection(USERS_COLLECTION).findOne({
      role: 'owner',
      'teamMembers.email': normalizedMemberEmail,
    })) as User | null
  );

  if (!owner) return null;

  const member = getTeamMembersFromUser(owner).find((m) => m.email === normalizedMemberEmail);
  if (!member) return null;

  return {
    ownerEmail: owner.email,
    role: member.role,
  };
}

export async function upsertUser(email: string): Promise<User> {
  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const now = new Date();
  const existingUser = (await db.collection<User>(USERS_COLLECTION).findOne({ email: normalizedEmail })) as User | null;

  if (existingUser) {
    const sanitizedExisting = sanitizeUser(existingUser) as User;

    let nextRole = sanitizedExisting.role;
    let nextTeamOwnerEmail = sanitizedExisting.teamOwnerEmail;

    if (sanitizedExisting.role !== 'owner') {
      const membership = await findOwnerMembership(db, normalizedEmail, sanitizedExisting.teamOwnerEmail);
      if (membership) {
        nextRole = membership.role;
        nextTeamOwnerEmail = membership.ownerEmail;
      } else {
        nextRole = 'viewer';
        nextTeamOwnerEmail = undefined;
      }
    } else {
      nextTeamOwnerEmail = undefined;
    }

    const updateOps: any = {
      $set: {
        lastLoginAt: now,
        role: nextRole,
      },
    };

    if (nextTeamOwnerEmail) {
      updateOps.$set.teamOwnerEmail = nextTeamOwnerEmail;
    } else {
      updateOps.$unset = { teamOwnerEmail: '' };
    }

    await db.collection(USERS_COLLECTION).updateOne({ email: normalizedEmail }, updateOps);

    const updatedUser = (await db.collection<User>(USERS_COLLECTION).findOne({ email: normalizedEmail })) as User | null;
    if (!updatedUser) {
      throw new Error('Failed to load updated user');
    }

    return sanitizeUser(updatedUser) as User;
  }

  const newUser: User = {
    email: normalizedEmail,
    role: 'viewer',
    createdAt: now,
    lastLoginAt: now,
  };

  await db.collection(USERS_COLLECTION).insertOne(newUser as any);
  return sanitizeUser(newUser) as User;
}

export async function createOTP(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

  const otpRecord: OTPRecord = {
    email: normalizedEmail,
    otp,
    expiresAt,
    createdAt: now,
  };

  await db.collection(OTP_COLLECTION).deleteMany({ email: normalizedEmail });
  await db.collection(OTP_COLLECTION).insertOne(otpRecord as any);

  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const record = await db.collection<OTPRecord>(OTP_COLLECTION).findOne({
    email: normalizedEmail,
    otp,
    expiresAt: { $gt: new Date() },
  } as any);

  if (record) {
    await db.collection(OTP_COLLECTION).deleteOne({ email: normalizedEmail, otp } as any);
    return true;
  }

  return false;
}

export async function getUser(email: string): Promise<User | null> {
  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);
  const user = (await db.collection<User>(USERS_COLLECTION).findOne({ email: normalizedEmail })) as User | null;

  if (!user) return null;
  return sanitizeUser(user);
}

export async function upsertInstagramAccounts(email: string, accounts: InstagramAccountConnection[]): Promise<void> {
  if (accounts.length === 0) return;

  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const user = await getUser(normalizedEmail);
  const existingAccounts = getAccountsFromUser(user);
  const now = new Date();

  const mergedByKey = new Map<string, InstagramAccountConnection>();

  for (const account of existingAccounts) {
    const normalized = normalizeAccount(account);
    const key = `${normalized.pageId}:${normalized.instagramUserId}`;
    mergedByKey.set(key, normalized);
  }

  for (const account of accounts) {
    const normalized = normalizeAccount({
      ...account,
      isConnected: account.isConnected ?? true,
      updatedAt: now,
      connectedAt: account.connectedAt ?? now,
    });
    const key = `${normalized.pageId}:${normalized.instagramUserId}`;
    const existing = mergedByKey.get(key);
    mergedByKey.set(key, {
      ...existing,
      ...normalized,
      accountId: existing?.accountId || normalized.accountId || randomUUID(),
      connectedAt: existing?.connectedAt || normalized.connectedAt,
      updatedAt: now,
      isConnected: true,
    });
  }

  await db.collection(USERS_COLLECTION).updateOne(
    { email: normalizedEmail },
    {
      $set: {
        instagramAccounts: Array.from(mergedByKey.values()),
        updatedAt: now,
      },
      $unset: {
        instagramConfig: '',
      },
    }
  );
}

export async function updateInstagramConfig(email: string, config: InstagramConfig): Promise<void> {
  const now = new Date();
  await upsertInstagramAccounts(email, [
    {
      accountId: randomUUID(),
      accessToken: config.accessToken,
      pageId: config.pageId,
      instagramUserId: config.instagramUserId,
      graphVersion: config.graphVersion,
      isConnected: config.isConnected,
      connectedAt: toDate(config.updatedAt, now),
      updatedAt: now,
    },
  ]);
}

export async function getConnectedInstagramAccounts(email: string): Promise<InstagramAccountConnection[]> {
  const user = await getUser(email);
  return getAccountsFromUser(user).filter((account) => account.isConnected);
}

export async function getInstagramAccountById(
  email: string,
  accountId: string
): Promise<InstagramAccountConnection | null> {
  const accounts = await getConnectedInstagramAccounts(email);
  return accounts.find((account) => account.accountId === accountId) || null;
}

export async function disconnectInstagramAccount(email: string, accountId: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const result = await db.collection(USERS_COLLECTION).updateOne(
    { email: normalizedEmail },
    {
      $pull: {
        instagramAccounts: { accountId },
      },
      $set: {
        updatedAt: new Date(),
      },
    } as any
  );
  return result.modifiedCount > 0;
}

export async function getUserCredentials(email: string): Promise<InstagramConfig | null> {
  const connectedAccounts = await getConnectedInstagramAccounts(email);
  if (connectedAccounts.length !== 1) return null;
  return toLegacyConfig(connectedAccounts[0]);
}

export async function getOwnerCredentials(): Promise<InstagramConfig | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const user = (await db.collection<User>(USERS_COLLECTION).findOne({
    role: 'owner',
    'instagramAccounts.isConnected': true,
  })) as User | null;

  if (!user) return null;

  const connectedAccounts = getAccountsFromUser(user).filter((account) => account.isConnected);
  if (connectedAccounts.length !== 1) return null;
  return toLegacyConfig(connectedAccounts[0]);
}

export async function getUserByInstagramId(
  instagramId: string
): Promise<{ user: User; account: InstagramAccountConnection } | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const user = (await db.collection<User>(USERS_COLLECTION).findOne({
    'instagramAccounts.instagramUserId': instagramId,
    'instagramAccounts.isConnected': true,
  })) as User | null;

  if (!user) {
    const legacyUser = (await db.collection<User>(USERS_COLLECTION).findOne({
      'instagramConfig.instagramUserId': instagramId,
      'instagramConfig.isConnected': true,
    })) as User | null;

    if (!legacyUser) return null;

    const sanitizedLegacyUser = sanitizeUser(legacyUser) as User;
    const account = getAccountsFromUser(sanitizedLegacyUser).find(
      (a) => a.instagramUserId === instagramId && a.isConnected
    );
    if (!account) return null;

    return { user: sanitizedLegacyUser, account };
  }

  const sanitizedUser = sanitizeUser(user) as User;
  const account = getAccountsFromUser(sanitizedUser).find((a) => a.instagramUserId === instagramId && a.isConnected);
  if (!account) return null;

  return { user: sanitizedUser, account };
}

export async function getWorkspaceOwnerEmail(email: string): Promise<string | null> {
  const user = await getUser(email);
  if (!user) return null;

  if (user.role === 'owner') return user.email;
  if ((user.role === 'setter' || user.role === 'closer') && user.teamOwnerEmail) {
    return normalizeEmail(user.teamOwnerEmail);
  }

  return user.email;
}

export async function getTeamMembersForOwner(ownerEmail: string): Promise<TeamMember[]> {
  const owner = await getUser(ownerEmail);
  if (!owner || owner.role !== 'owner') return [];

  return getTeamMembersFromUser(owner);
}

export async function addTeamMemberByOwner(
  ownerEmail: string,
  memberEmail: string,
  role: TeamMemberRole
): Promise<void> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (!normalizedMemberEmail || !isTeamMemberRole(role)) {
    throw new Error('Invalid team member payload');
  }

  if (normalizedMemberEmail === normalizedOwnerEmail) {
    throw new Error('Owner cannot add themselves as a team member');
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== 'owner') {
    throw new Error('Only owners can manage team members');
  }

  const existingTeamMembers = getTeamMembersFromUser(owner);
  const now = new Date();

  const nextTeamMembers = [...existingTeamMembers];
  const existingIndex = nextTeamMembers.findIndex((member) => member.email === normalizedMemberEmail);

  if (existingIndex >= 0) {
    nextTeamMembers[existingIndex] = {
      ...nextTeamMembers[existingIndex],
      role,
      updatedAt: now,
    };
  } else {
    nextTeamMembers.push({
      email: normalizedMemberEmail,
      role,
      addedAt: now,
      updatedAt: now,
    });
  }

  const member = await getUser(normalizedMemberEmail);
  if (member?.role === 'owner' && member.email !== normalizedOwnerEmail) {
    throw new Error('This email is already an owner and cannot be added to a team');
  }

  await Promise.all([
    db.collection(USERS_COLLECTION).updateOne(
      { email: normalizedOwnerEmail },
      {
        $set: {
          teamMembers: nextTeamMembers,
          updatedAt: now,
        },
      }
    ),
    db.collection(USERS_COLLECTION).updateOne(
      { email: normalizedMemberEmail },
      {
        $set: {
          role,
          teamOwnerEmail: normalizedOwnerEmail,
          updatedAt: now,
        },
        $setOnInsert: {
          email: normalizedMemberEmail,
          createdAt: now,
          lastLoginAt: now,
        },
      },
      { upsert: true }
    ),
  ]);
}

export async function removeTeamMemberByOwner(ownerEmail: string, memberEmail: string): Promise<boolean> {
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);
  const normalizedMemberEmail = normalizeEmail(memberEmail);

  if (!normalizedMemberEmail || normalizedMemberEmail === normalizedOwnerEmail) {
    return false;
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const owner = await getUser(normalizedOwnerEmail);
  if (!owner || owner.role !== 'owner') {
    throw new Error('Only owners can remove team members');
  }

  const existingTeamMembers = getTeamMembersFromUser(owner);
  const isMember = existingTeamMembers.some((member) => member.email === normalizedMemberEmail);
  if (!isMember) return false;

  const now = new Date();

  await Promise.all([
    db.collection(USERS_COLLECTION).updateOne(
      { email: normalizedOwnerEmail },
      {
        $pull: {
          teamMembers: { email: normalizedMemberEmail },
        },
        $set: { updatedAt: now },
      } as any
    ),
    db.collection(USERS_COLLECTION).deleteOne({
      email: normalizedMemberEmail,
      teamOwnerEmail: normalizedOwnerEmail,
    }),
    db.collection(OTP_COLLECTION).deleteMany({ email: normalizedMemberEmail }),
  ]);

  return true;
}
