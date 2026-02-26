import { revalidatePath } from 'next/cache';
import { Crown, Mail, Shield, Trash2, UserPlus, Users2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import TeamRoleDropdown from '@/components/settings/TeamRoleDropdown';
import { requireCurrentUser } from '@/lib/currentUser';
import { sendTeamInvitationEmail } from '@/lib/email';
import {
  addTeamMemberByOwner,
  getTeamMembersForOwner,
  getUser,
  removeTeamMemberByOwner,
} from '@/lib/userRepository';
import { getCachedTeamMembersForOwner, getCachedUser } from '@/lib/settingsCache';
import type { TeamMemberRole } from '@/types/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function addTeamMemberAction(formData: FormData) {
  'use server';

  const { user } = await requireCurrentUser();
  if (user.role !== 'owner') {
    redirect('/settings/team');
  }

  const emailValue = String(formData.get('email') || '').trim().toLowerCase();
  const roleValue = String(formData.get('role') || '').trim().toLowerCase();

  if (!EMAIL_REGEX.test(emailValue)) {
    redirect('/settings/team?error=invalid_email');
  }

  if (roleValue !== 'setter' && roleValue !== 'closer') {
    redirect('/settings/team?error=invalid_role');
  }

  try {
    await addTeamMemberByOwner(user.email, emailValue, roleValue as TeamMemberRole);

    await sendTeamInvitationEmail({
      ownerEmail: user.email,
      memberEmail: emailValue,
      role: roleValue as TeamMemberRole,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed_to_add_member';
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/settings/team');
  redirect('/settings/team?success=member_saved');
}

async function removeTeamMemberAction(formData: FormData) {
  'use server';

  const { user } = await requireCurrentUser();
  if (user.role !== 'owner') {
    redirect('/settings/team');
  }

  const emailValue = String(formData.get('email') || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(emailValue)) {
    redirect('/settings/team?error=invalid_email');
  }

  try {
    await removeTeamMemberByOwner(user.email, emailValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed_to_remove_member';
    redirect(`/settings/team?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/settings/team');
  redirect('/settings/team?success=member_removed');
}

interface TeamPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsTeamPage({ searchParams }: TeamPageProps) {
  const { user } = await requireCurrentUser();

  if (user.role === 'viewer') {
    return (
      <SettingsSectionCard
        badge="Team"
        title="Team access requires an active subscription"
        description="Viewer accounts cannot access team management yet."
      >
        <div className="px-6 py-6 md:px-8">
          <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-5">
            <p className="text-sm text-[#606266]">
              Please buy a subscription to unlock owner controls and invite Setter or Closer teammates.
            </p>
          </div>
        </div>
      </SettingsSectionCard>
    );
  }

  const params = await searchParams;
  const success = typeof params.success === 'string' ? params.success : '';
  const error = typeof params.error === 'string' ? params.error : '';

  const ownerEmail = user.role === 'owner' ? user.email : user.teamOwnerEmail;
  const shouldBypassCache = Boolean(success || error);
  const members = ownerEmail
    ? shouldBypassCache
      ? await getTeamMembersForOwner(ownerEmail)
      : await getCachedTeamMembersForOwner(ownerEmail)
    : [];
  const ownerUser = ownerEmail
    ? shouldBypassCache
      ? await getUser(ownerEmail)
      : await getCachedUser(ownerEmail)
    : null;

  return (
    <div className="space-y-4">
      {success && (
        <div className="rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          {success === 'member_saved' ? 'Team member saved successfully.' : 'Team member removed and account deleted.'}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <SettingsSectionCard
        badge="Team"
        title="Team workspace settings"
        description="Assign Setter and Closer roles for your shared workspace."
      >
        <div className="grid grid-cols-1 gap-4 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-2 md:px-8">
          <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users2 size={16} className="text-[#8771FF]" />
              <p className="text-sm font-semibold text-[#101011]">Workspace Owner</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-[#8771FF] text-white">Owner</Badge>
              <p className="font-mono text-sm text-[#606266]">{ownerUser?.email || user.email}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield size={16} className="text-[#8771FF]" />
              <p className="text-sm font-semibold text-[#101011]">Your Role</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
              {user.role !== 'owner' && user.teamOwnerEmail && (
                <p className="text-xs text-[#606266]">Managed by {user.teamOwnerEmail}</p>
              )}
            </div>
          </div>
        </div>

        {user.role === 'owner' && (
          <form action={addTeamMemberAction} className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
              <UserPlus size={16} className="text-[#8771FF]" /> Invite team member
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
              <div>
                <label htmlFor="team-member-email" className="mb-1 block text-xs font-medium text-[#606266]">
                  Team member email
                </label>
                <input
                  id="team-member-email"
                  name="email"
                  type="email"
                  required
                  placeholder="teammember@company.com"
                  className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
                />
              </div>

              <div>
                <label htmlFor="team-member-role" className="mb-1 block text-xs font-medium text-[#606266]">
                  Role
                </label>
                <TeamRoleDropdown name="role" defaultValue="setter" />
              </div>

              <Button type="submit" className="h-11 w-full md:w-auto">
                Add Member
              </Button>
            </div>
          </form>
        )}

        <div className="px-6 py-6 md:px-8">
          <h3 className="mb-4 text-sm font-semibold text-[#101011]">Team members</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-[#101011]">{ownerUser?.email || ownerEmail || user.email}</p>
                <p className="mt-0.5 text-xs text-[#606266]">Workspace owner</p>
              </div>
              <div className="flex items-center gap-2">
                <Crown size={14} className="text-[#8771FF]" />
                <Badge className="bg-[#8771FF] text-white">Owner</Badge>
              </div>
            </div>

            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D8D2FF] bg-[#F3F0FF] px-4 py-5 text-sm text-[#606266]">
                No Setter or Closer has been added yet.
              </div>
            ) : (
              members.map((member) => (
                <div key={member.email} className="flex items-center justify-between rounded-2xl border border-[#F0F2F6] bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-[#101011]">{member.email}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[#606266]">
                      <Mail size={12} />
                      <span>Added {new Date(member.addedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="ml-3 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {member.role}
                    </Badge>

                    {user.role === 'owner' && (
                      <form action={removeTeamMemberAction}>
                        <input type="hidden" name="email" value={member.email} />
                        <button
                          type="submit"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50"
                          aria-label={`Remove ${member.email}`}
                          title="Remove member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SettingsSectionCard>
    </div>
  );
}
