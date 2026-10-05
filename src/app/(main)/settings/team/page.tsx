import { redirect } from "next/navigation";
import DistributionSettingsContent from "@/components/settings/DistributionSettingsContent";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import ReplyPlaybookSection from "@/components/settings/team/ReplyPlaybookSection";
import TeamInviteForm from "@/components/settings/team/TeamInviteForm";
import TeamMembersCard from "@/components/settings/team/TeamMembersCard";
import TransferOwnershipForm from "@/components/settings/team/TransferOwnershipForm";
import {
  getTeamErrorMessage,
  getTeamSuccessMessage,
} from "@/components/settings/team/teamNotices";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";
import {
  canAccessDistributionSettings,
  canAccessTeamSettings,
  canManageReplyPlaybook,
} from "@/lib/permissions";
import {
  getReplyPlaybook,
  MAX_REPLY_PLAYBOOK_LENGTH,
} from "@/lib/replyPlaybookRepository";
import {
  isRoundRobinEnabled,
  listRoundRobinMembers,
} from "@/lib/roundRobinRepository";
import { getCachedTeamMembersForOwner } from "@/lib/settingsCache";
import { getTeamMembersForOwner } from "@/lib/userRepository";
import {
  addTeamMemberAction,
  removeTeamMemberAction,
  transferOwnershipAction,
  updateTeamMemberRoleAction,
} from "./actions";

interface TeamPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsTeamPage({
  searchParams,
}: TeamPageProps) {
  const { user } = await requireCurrentSettingsUser();
  if (!canAccessTeamSettings(user.role)) {
    redirect("/settings/profile");
  }

  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";

  const isOwner = user.role === "owner";
  const ownerEmail = isOwner ? user.email : (user.teamOwnerEmail ?? "");
  // Straight after an action the cached list is stale, so read it fresh.
  const shouldBypassCache = Boolean(success || error);
  const showDistribution = isOwner && canAccessDistributionSettings(user.role);

  const showPlaybook = isOwner && canManageReplyPlaybook(user.role);

  const [members, distribution, playbook] = await Promise.all([
    ownerEmail
      ? shouldBypassCache
        ? getTeamMembersForOwner(ownerEmail)
        : getCachedTeamMembersForOwner(ownerEmail)
      : Promise.resolve([]),
    showDistribution
      ? Promise.all([
          isRoundRobinEnabled(user.email),
          listRoundRobinMembers(user.email),
        ])
      : Promise.resolve(null),
    showPlaybook ? getReplyPlaybook(user.email) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        {success ? (
          <SettingsNotice tone="success">
            {getTeamSuccessMessage(success)}
          </SettingsNotice>
        ) : null}
        {error ? (
          <SettingsNotice tone="error">
            {getTeamErrorMessage(error)}
          </SettingsNotice>
        ) : null}

        <SettingsSectionCard
          allowOverflow
          title="Members"
          description={
            isOwner
              ? "Invite setters and closers by email. They sign in with that address and share your inbox and leads."
              : "Everyone who shares this workspace's inbox and leads."
          }
        >
          {isOwner ? <TeamInviteForm action={addTeamMemberAction} /> : null}
          <TeamMembersCard
            ownerEmail={ownerEmail || user.email}
            members={members}
            canManage={isOwner}
            updateRoleAction={updateTeamMemberRoleAction}
            removeMemberAction={removeTeamMemberAction}
          />
        </SettingsSectionCard>
      </div>

      {distribution ? (
        <DistributionSettingsContent
          initialEnabled={distribution[0]}
          initialMembers={distribution[1]}
        />
      ) : null}

      {playbook !== null ? (
        <ReplyPlaybookSection
          initialInstructions={playbook}
          maxLength={MAX_REPLY_PLAYBOOK_LENGTH}
        />
      ) : null}

      {isOwner && members.length > 0 ? (
        <SettingsSectionCard
          allowOverflow
          title="Transfer ownership"
          description="Hand the workspace to a team member. Leads, conversations, statuses and settings move to them, and you become a setter or closer. Connected Instagram accounts do not move, and this cannot be undone from the app."
        >
          <TransferOwnershipForm
            members={members}
            action={transferOwnershipAction}
          />
        </SettingsSectionCard>
      ) : null}
    </div>
  );
}
