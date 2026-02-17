import { getSession } from '@/lib/auth';
import { canAccessInbox } from '@/lib/permissions';
import { getUser, getWorkspaceOwnerEmail } from '@/lib/userRepository';
import type { User } from '@/types/auth';

export class AccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export interface WorkspaceContext {
  sessionEmail: string;
  user: User;
  workspaceOwnerEmail: string;
}

export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await getSession();
  if (!session?.email) {
    throw new AccessError('Unauthorized', 401);
  }

  const user = await getUser(session.email);
  if (!user) {
    throw new AccessError('Unauthorized', 401);
  }

  const workspaceOwnerEmail = await getWorkspaceOwnerEmail(user.email);
  if (!workspaceOwnerEmail) {
    throw new AccessError('Unauthorized', 401);
  }

  return {
    sessionEmail: user.email,
    user,
    workspaceOwnerEmail,
  };
}

export async function requireInboxWorkspaceContext(): Promise<WorkspaceContext> {
  const context = await requireWorkspaceContext();

  if (!canAccessInbox(context.user.role)) {
    throw new AccessError('Forbidden', 403);
  }

  return context;
}
