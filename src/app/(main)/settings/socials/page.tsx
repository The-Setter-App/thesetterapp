import {
  CircleAlert,
  CircleCheck,
  Clock,
  Globe,
  Hash,
  Instagram,
  KeyRound,
  Link2,
  Link2Off,
  Plus,
  User,
} from "lucide-react";
import { redirect } from "next/navigation";
import ConnectSyncWarmupStatus from "@/components/settings/ConnectSyncWarmupStatus";
import DisconnectAccountButton from "@/components/settings/DisconnectAccountButton";
import DisconnectCacheCleanup from "@/components/settings/DisconnectCacheCleanup";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { requireCurrentUser } from "@/lib/currentUser";
import { getCachedConnectedInstagramAccounts } from "@/lib/settingsCache";
import { getConnectedInstagramAccounts } from "@/lib/userRepository";

interface SocialsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

export default async function SettingsSocialsPage({
  searchParams,
}: SocialsPageProps) {
  const { session, user } = await requireCurrentUser();
  if (user.role !== "owner") {
    redirect(user.role === "viewer" ? "/settings/profile" : "/settings/team");
  }

  const params = await searchParams;
  const error = params.error;
  const success = params.success;
  const warning = params.warning;
  const disconnectedAccountId =
    typeof params.disconnectedAccountId === "string"
      ? params.disconnectedAccountId
      : undefined;
  const missingRaw = params.missing;
  const missingScopes =
    typeof missingRaw === "string" ? missingRaw.split(",").filter(Boolean) : [];
  const connectedCountRaw = params.connectedCount;
  const connectedCount =
    typeof connectedCountRaw === "string"
      ? Number.parseInt(connectedCountRaw, 10)
      : undefined;
  const connectSuccess = success === "true";
  const shouldBypassCache = Boolean(
    error || success || warning || disconnectedAccountId,
  );
  const accounts = shouldBypassCache
    ? await getConnectedInstagramAccounts(session.email)
    : await getCachedConnectedInstagramAccounts(session.email);
  const isConnected = accounts.length > 0;

  return (
    <div className="space-y-4">
      <DisconnectCacheCleanup disconnectedAccountId={disconnectedAccountId} />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
          <CircleAlert size={20} className="shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">
            {error === "missing_required_scopes"
              ? `Missing required permissions: ${missingScopes.join(", ")}`
              : `Error connecting to Instagram: ${error}`}
          </p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-6 py-4">
          <CircleCheck size={20} className="shrink-0 text-[#8771FF]" />
          <p className="text-sm font-medium text-[#6d5ed6]">
            {success === "disconnected"
              ? "Instagram account disconnected successfully."
              : `Connected Instagram account${connectedCount && connectedCount > 1 ? "s" : ""} successfully${
                  connectedCount ? ` (${connectedCount} found)` : ""
                }.`}
          </p>
        </div>
      )}

      {warning && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-6 py-4">
          <CircleAlert size={20} className="shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-[#606266]">
            Instagram connected, but one or more Page webhook subscriptions
            failed. Reconnect and check server logs.
          </p>
        </div>
      )}

      <SettingsSectionCard
        title="Instagram account connections"
        description="Connect and manage Instagram business accounts used by Inbox."
      >
        <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(135,113,255,0.1)]">
                <Instagram size={24} className="text-[#8771FF]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#101011]">
                  Instagram Integrations
                </h3>
                <p className="mt-0.5 text-sm text-[#606266]">
                  Sync Instagram Direct Messages from multiple accounts.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <ConnectSyncWarmupStatus connectSuccess={connectSuccess} />
              {isConnected ? (
                <Badge
                  variant="secondary"
                  className="gap-1.5 bg-[rgba(135,113,255,0.1)] px-3 py-1.5 text-sm text-[#8771FF]"
                >
                  <Link2 size={14} /> {accounts.length} Connected
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-[#F0F2F6] bg-[#F8F7FF] px-3 py-1.5 text-sm text-[#606266]"
                >
                  <Link2Off size={14} /> Not Connected
                </Badge>
              )}
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="flex flex-col items-center px-8 py-14 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#F0F2F6] bg-[#F8F7FF] shadow-sm">
              <Link2Off size={28} className="text-[#8771FF]" />
            </div>
            <p className="mb-2 text-base font-bold text-[#101011]">
              No Instagram accounts connected
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-[#606266]">
              Connect your Facebook Pages to start syncing Instagram Direct
              Messages with Setter.
            </p>
          </div>
        )}

        {isConnected && (
          <div className="space-y-4 px-4 py-4 md:px-8">
            {accounts.map((account) => (
              <div
                key={account.accountId}
                className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4 md:p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-2 py-1 text-xs text-[#8771FF]"
                      >
                        Account
                      </Badge>
                      <span className="text-sm font-semibold text-[#101011]">
                        {account.instagramUsername
                          ? `@${account.instagramUsername.replace(/^@/, "")}`
                          : account.pageName || "Unnamed account"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      <div className="flex items-center gap-2 text-[#606266]">
                        <Hash size={15} className="text-[#8771FF]" />
                        <span className="font-mono text-xs">
                          {account.pageId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#606266]">
                        <User size={15} className="text-[#8771FF]" />
                        <span className="font-mono text-xs">
                          {account.instagramUserId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#606266]">
                        <Globe size={15} className="text-[#8771FF]" />
                        <span>{account.graphVersion}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#606266]">
                        <Clock size={15} className="text-[#8771FF]" />
                        <span>
                          {new Date(account.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[#606266]">
                        <KeyRound size={15} className="text-[#8771FF]" />
                        <span>Token encrypted</span>
                      </div>
                    </div>
                  </div>

                  <DisconnectAccountButton
                    accountId={account.accountId}
                    accountLabel={
                      account.instagramUsername
                        ? `@${account.instagramUsername.replace(/^@/, "")}`
                        : account.pageName || "this account"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end border-t border-[#F0F2F6] bg-[#FAFAFF] px-6 py-6 md:px-8">
          <a
            href="/api/auth/instagram/login"
            className="inline-block w-full md:w-auto"
          >
            <Button
              className="h-12 w-full bg-[#8771FF] text-white hover:scale-[1.02] hover:bg-[#6d5ed6] md:w-auto"
              leftIcon={<Plus size={16} />}
            >
              Add Instagram Account
            </Button>
          </a>
        </div>
      </SettingsSectionCard>
    </div>
  );
}
