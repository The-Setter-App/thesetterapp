import { Plus } from "lucide-react";
import ConnectSyncWarmupStatus from "@/components/settings/instagram/ConnectSyncWarmupStatus";
import InstagramAccountRow, {
  type InstagramAccountSummary,
} from "@/components/settings/instagram/InstagramAccountRow";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { SETTINGS_PRIMARY_BUTTON_CLASS } from "@/components/settings/settingsStyles";
import SetterScoopMark from "@/components/ui/SetterScoopMark";

const CONNECT_URL = "/api/auth/instagram/login";

interface InstagramAccountsSectionProps {
  accounts: InstagramAccountSummary[];
  connectSuccess: boolean;
}

export default function InstagramAccountsSection({
  accounts,
  connectSuccess,
}: InstagramAccountsSectionProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <SettingsSectionCard
      title="Accounts"
      description="The Instagram accounts whose direct messages arrive in your inbox."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <ConnectSyncWarmupStatus connectSuccess={connectSuccess} />
          {hasAccounts ? (
            // A plain link: connecting leaves the app for Instagram.
            <a
              href={CONNECT_URL}
              className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              <Plus size={16} aria-hidden="true" />
              Connect account
            </a>
          ) : null}
        </div>
      }
    >
      {hasAccounts ? (
        <ul className="divide-y divide-[#F0F2F6]">
          {accounts.map((account) => (
            <InstagramAccountRow key={account.accountId} account={account} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <SetterScoopMark className="h-auto w-20" />
          <p className="mt-6 text-lg font-semibold tracking-[-0.02em] text-[#101011]">
            No Instagram account connected
          </p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#606266]">
            Connect the Facebook Page linked to your Instagram account and its
            direct messages will start arriving in Setter.
          </p>
          <a
            href={CONNECT_URL}
            className={`${SETTINGS_PRIMARY_BUTTON_CLASS} mt-6 w-full sm:w-auto`}
          >
            <Plus size={16} aria-hidden="true" />
            Connect Instagram
          </a>
        </div>
      )}
    </SettingsSectionCard>
  );
}
