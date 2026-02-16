export type UserRole = 'owner' | 'viewer';

export interface InstagramConfig {
  accessToken: string; // Encrypted
  pageId: string;
  instagramUserId: string; // IGSID
  graphVersion: string;
  isConnected: boolean;
  updatedAt: Date;
}

export interface InstagramAccountConnection {
  accountId: string;
  accessToken: string; // Encrypted
  pageId: string;
  instagramUserId: string; // IGSID
  graphVersion: string;
  isConnected: boolean;
  connectedAt: Date;
  updatedAt: Date;
  pageName?: string;
  instagramUsername?: string;
}

export interface User {
  email: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
  instagramAccounts?: InstagramAccountConnection[];
  // Legacy single-account shape kept for backward compatibility/migration.
  instagramConfig?: InstagramConfig;
}

export interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface JWTPayload {
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
