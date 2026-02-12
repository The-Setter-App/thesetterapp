import clientPromise from '@/lib/mongodb';
import { User, OTPRecord, InstagramConfig } from '@/types/auth';

const DB_NAME = 'thesetterapp';
const USERS_COLLECTION = 'users';
const OTP_COLLECTION = 'otps';

export async function upsertUser(email: string): Promise<User> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
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
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ email });

  if (!user) return null;

  // Sanitize _id
  const { _id, ...rest } = user as any;
  return rest as User;
}

export async function updateInstagramConfig(email: string, config: InstagramConfig): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  await db.collection(USERS_COLLECTION).updateOne(
    { email },
    { 
      $set: { 
        instagramConfig: config,
        updatedAt: new Date()
      } 
    }
  );
}

export async function getOwnerCredentials(): Promise<InstagramConfig | null> {
  // @deprecated - Use specific user lookup methods instead
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ 
    'instagramConfig.isConnected': true 
  });
  if (!user || !user.instagramConfig) return null;
  return user.instagramConfig;
}

export async function getUserByInstagramId(instagramId: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  const user = await db.collection<User>(USERS_COLLECTION).findOne({ 
    'instagramConfig.instagramUserId': instagramId,
    'instagramConfig.isConnected': true
  });

  if (!user) return null;

  // Sanitize _id
  const { _id, ...rest } = user as any;
  return rest as User;
}