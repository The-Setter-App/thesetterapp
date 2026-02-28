export type TeamMemberRole = 'setter' | 'closer';
export type UserRole = 'owner' | TeamMemberRole | 'viewer';

export interface TeamMember {
  email: string;
  role: TeamMemberRole;
  addedAt: Date;
  updatedAt: Date;
}

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
  displayName?: string;
  profileImageBase64?: string;
  hasCompletedOnboarding?: boolean;
  teamOwnerEmail?: string;
  teamMembers?: TeamMember[];
  instagramAccounts?: InstagramAccountConnection[];
  // Legacy single-account shape kept for backward compatibility/migration.
  instagramConfig?: InstagramConfig;
}

export interface OTPRecord {
  email: string;
  otpHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface JWTPayload {
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
