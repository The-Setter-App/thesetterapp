export type UserRole = 'owner' | 'viewer';

export interface InstagramConfig {
  accessToken: string; // Encrypted
  pageId: string;
  instagramUserId: string; // IGSID
  graphVersion: string;
  isConnected: boolean;
  updatedAt: Date;
}

export interface User {
  email: string;
  role: UserRole;
  createdAt: Date;
  lastLoginAt?: Date;
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