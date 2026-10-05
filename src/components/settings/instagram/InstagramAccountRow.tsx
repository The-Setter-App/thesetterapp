import { ChevronDown, Instagram } from "lucide-react";
import DisconnectAccountButton from "@/components/settings/instagram/DisconnectAccountButton";
import { SETTINGS_BLOCK_CLASS } from "@/components/settings/settingsStyles";

// Only the fields the row shows. The stored connection also holds the access
// token, which must stay on the server.
export interface InstagramAccountSummary {
  accountId: string;
  pageId: string;
  instagramUserId: string;
  graphVersion: string;
  updatedAt: Date;
  pageName?: string;
  instagramUsername?: string;
}

interface InstagramAccountRowProps {
  account: InstagramAccountSummary;
}

interface DetailProps {
  label: string;
  value: string;
}

function Detail({ label, value }: DetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#9A9CA2]">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-xs text-[#606266]">
        {value}
      </dd>
    </div>
  );
}

export default function InstagramAccountRow({
  account,
}: InstagramAccountRowProps) {
  const username = account.instagramUsername?.replace(/^@/, "");
  const title = username ? `@${username}` : account.pageName || "Instagram";
  const subtitle =
    username && account.pageName ? account.pageName : "Instagram account";

  return (
    <li className={`${SETTINGS_BLOCK_CLASS} !py-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]"
          >
            <Instagram size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-medium text-[#101011]">
              {title}
            </p>
            <p className="truncate text-xs text-[#9A9CA2]">{subtitle}</p>
          </div>
        </div>
        <DisconnectAccountButton
          accountId={account.accountId}
          accountLabel={title}
        />
      </div>

      <details className="group mt-1 pl-[3.25rem]">
        <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1 text-xs font-medium text-[#606266] outline-none [&::-webkit-details-marker]:hidden">
          Connection details
          <ChevronDown
            size={14}
            aria-hidden="true"
            className="transition-transform duration-150 group-open:rotate-180"
          />
        </summary>
        <dl className="grid grid-cols-1 gap-3 pb-1 pt-1 sm:grid-cols-2">
          <Detail label="Facebook Page ID" value={account.pageId} />
          <Detail label="Instagram user ID" value={account.instagramUserId} />
          <Detail label="Graph API version" value={account.graphVersion} />
          <Detail
            label="Last updated"
            value={new Date(account.updatedAt).toLocaleString()}
          />
        </dl>
      </details>
    </li>
  );
}
