import clientPromise from '@/lib/mongodb';
import { randomUUID } from 'crypto';
import { User, OTPRecord, InstagramConfig, InstagramAccountConnection } from '@/types/auth';

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

async function ensureUserIndexes(db: any): Promise<void> {
  if (userIndexesReady) return;
  await Promise.allSettled([
    db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true }),
    db.collection(USERS_COLLECTION).createIndex({ 'instagramAccounts.accountId': 1 }),
    db.collection(USERS_COLLECTION).createIndex({ 'instagramAccounts.instagramUserId': 1 }),
  ]);
  userIndexesReady = true;
}

export async function upsertUser(email: string): Promise<User> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);
  
  const now = new Date();
  
  const existingUser = await db.collection<User>(USERS_COLLECTION).findOne({ email });
  
  if (existingUser) {
    await db.collection(USERS_COLLECTION).updateOne(
      { email },
      { $set: { lastLoginAt: now } }
    );
    // Sanitize _id
    const { _id, ...rest } = existingUser as any;
    return { ...rest, lastLoginAt: now } as User;
  } else {
    const newUser: User = {
      email,
      role: 'viewer', // Default role
      createdAt: now,
      lastLoginAt: now,
    };
    await db.collection(USERS_COLLECTION).insertOne(newUser);
    // insertOne adds _id to the object, so we must sanitize it before returning
    const { _id, ...rest } = newUser as any;
    return rest as User;
  }
}

export async function createOTP(email: string): Promise<string> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry
  
  const otpRecord: OTPRecord = {
    email,
    otp,
    expiresAt,
    createdAt: now
  };
  
  // Invalidate previous OTPs for this email
  await db.collection(OTP_COLLECTION).deleteMany({ email });
  
  await db.collection(OTP_COLLECTION).insertOne(otpRecord);
  
  return otp;
}

export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  const record = await db.collection<OTPRecord>(OTP_COLLECTION).findOne({
    email,
    otp,
    expiresAt: { $gt: new Date() }
  });
  
  if (record) {
    // Consume OTP so it can't be used again
    await db.collection(OTP_COLLECTION).deleteOne({ email, otp });
    return true;
  }
  
  return false;
}

export async function getUser(email: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ email });

  if (!user) return null;

  // Sanitize _id
  const { _id, ...rest } = user as any;
  return rest as User;
}

export async function upsertInstagramAccounts(email: string, accounts: InstagramAccountConnection[]): Promise<void> {
  if (accounts.length === 0) return;
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const user = await getUser(email);
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
    { email },
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
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);

  const result = await db.collection(USERS_COLLECTION).updateOne(
    { email },
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
  // @deprecated - Use getUserCredentials(email) instead
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await ensureUserIndexes(db);
  const user = await db.collection<User>(USERS_COLLECTION).findOne({
    'instagramAccounts.isConnected': true,
  });
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

  const user = await db.collection<User>(USERS_COLLECTION).findOne({
    'instagramAccounts.instagramUserId': instagramId,
    'instagramAccounts.isConnected': true,
  });

  if (!user) {
    const legacyUser = await db.collection<User>(USERS_COLLECTION).findOne({
      'instagramConfig.instagramUserId': instagramId,
      'instagramConfig.isConnected': true,
    });
    if (!legacyUser) return null;
    const { _id, ...rest } = legacyUser as any;
    const account = getAccountsFromUser(rest as User).find((a) => a.instagramUserId === instagramId && a.isConnected);
    if (!account) return null;
    return { user: rest as User, account };
  }

  // Sanitize _id
  const { _id, ...rest } = user as any;
  const account = getAccountsFromUser(rest as User).find((a) => a.instagramUserId === instagramId && a.isConnected);
  if (!account) return null;
  return { user: rest as User, account };
}
