import { redirect } from "next/navigation";
import CommentAutomationsSettingsContent from "@/components/settings/comment-automations/CommentAutomationsSettingsContent";
import BlockedUsersSettingsContent from "@/components/settings/instagram/BlockedUsersSettingsContent";
import DisconnectCacheCleanup from "@/components/settings/instagram/DisconnectCacheCleanup";
import type { InstagramAccountSummary } from "@/components/settings/instagram/InstagramAccountRow";
import InstagramAccountsSection from "@/components/settings/instagram/InstagramAccountsSection";
import { readInstagramConnectionNotices } from "@/components/settings/instagram/instagramNotices";
import SettingsNotice from "@/components/settings/SettingsNotice";
import { listBlockedUsernames } from "@/lib/blockedUsernamesRepository";
import { listCommentAutomationsWithDetails } from "@/lib/commentAutomationsRepository";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";
import {
  canAccessBlockedUsersSettings,
  canAccessCommentAutomationsSettings,
  canAccessSocialSettings,
} from "@/lib/permissions";
import { getCachedConnectedInstagramAccounts } from "@/lib/settingsCache";
import {
  getConnectedInstagramAccounts,
  getWorkspaceOwnerEmail,
} from "@/lib/userRepository";

interface SocialsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

// The Instagram tab. Owners manage connected accounts and comment
// automations here; setters and closers only see the blocked accounts list.
export default async function SettingsSocialsPage({
  searchParams,
}: SocialsPageProps) {
  const { session, user } = await requireCurrentSettingsUser();

  const showAccounts = canAccessSocialSettings(user.role);
  const showAutomations = canAccessCommentAutomationsSettings(user.role);
  const showBlocked = canAccessBlockedUsersSettings(user.role);
  if (!showAccounts && !showAutomations && !showBlocked) {
    redirect("/settings/profile");
  }

  const notices = readInstagramConnectionNotices(await searchParams);

  const workspaceOwnerEmail =
    showAutomations || showBlocked
      ? await getWorkspaceOwnerEmail(user.email)
      : null;

  const [connections, automations, blockedUsernames] = await Promise.all([
    showAccounts
      ? // Straight after a connect or disconnect the cached list is stale.
        notices.hasConnectionState
        ? getConnectedInstagramAccounts(session.email)
        : getCachedConnectedInstagramAccounts(session.email)
      : Promise.resolve([]),
    showAutomations && workspaceOwnerEmail
      ? listCommentAutomationsWithDetails(workspaceOwnerEmail)
      : Promise.resolve([]),
    showBlocked && workspaceOwnerEmail
      ? listBlockedUsernames(workspaceOwnerEmail)
      : Promise.resolve([]),
  ]);

  // Leave the access token behind; the page only needs what it displays.
  const accounts: InstagramAccountSummary[] = connections.map((account) => ({
    accountId: account.accountId,
    pageId: account.pageId,
    instagramUserId: account.instagramUserId,
    graphVersion: account.graphVersion,
    updatedAt: account.updatedAt,
    pageName: account.pageName,
    instagramUsername: account.instagramUsername,
  }));

  return (
    <div className="space-y-10">
      {showAccounts ? (
        <div className="space-y-3">
          <DisconnectCacheCleanup
            disconnectedAccountId={notices.disconnectedAccountId}
          />
          {notices.error ? (
            <SettingsNotice tone="error">{notices.error}</SettingsNotice>
          ) : null}
          {notices.success ? (
            <SettingsNotice tone="success">{notices.success}</SettingsNotice>
          ) : null}
          {notices.warning ? (
            <SettingsNotice tone="warning">{notices.warning}</SettingsNotice>
          ) : null}
          <InstagramAccountsSection
            accounts={accounts}
            connectSuccess={notices.connectSuccess}
          />
        </div>
      ) : null}

      {showAutomations ? (
        <CommentAutomationsSettingsContent initialAutomations={automations} />
      ) : null}

      {showBlocked ? (
        <BlockedUsersSettingsContent
          initialBlockedUsernames={blockedUsernames}
        />
      ) : null}
    </div>
  );
}
