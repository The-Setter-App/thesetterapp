import { Trash2 } from "lucide-react";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_ICON_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import TeamRoleDropdown from "@/components/settings/team/TeamRoleDropdown";
import type { TeamMember } from "@/types/auth";

interface TeamMembersCardProps {
  ownerEmail: string;
  members: TeamMember[];
  // Owners can change roles and remove people; everyone else only reads.
  // A role is saved as soon as a different one is picked.
  canManage: boolean;
  updateRoleAction: (formData: FormData) => void;
  removeMemberAction: (formData: FormData) => void;
}

const ROW_CLASS = `${SETTINGS_BLOCK_CLASS} flex flex-col gap-3 !py-3.5 sm:flex-row sm:items-center sm:justify-between`;

const ROLE_PILL_CLASS =
  "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold capitalize";

function formatAddedDate(value: Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface MemberIdentityProps {
  email: string;
  detail: string;
}

function MemberIdentity({ email, detail }: MemberIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-sm font-semibold uppercase text-[#8771FF]"
      >
        {email.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-medium text-[#101011]">
          {email}
        </p>
        <p className="text-xs text-[#9A9CA2]">{detail}</p>
      </div>
    </div>
  );
}

export default function TeamMembersCard({
  ownerEmail,
  members,
  canManage,
  updateRoleAction,
  removeMemberAction,
}: TeamMembersCardProps) {
  return (
    <ul className="divide-y divide-[#F0F2F6]">
      <li className={ROW_CLASS}>
        <MemberIdentity email={ownerEmail} detail="Workspace owner" />
        <span
          className={`${ROLE_PILL_CLASS} ml-12 w-fit bg-[#8771FF] text-white sm:ml-0`}
        >
          Owner
        </span>
      </li>

      {members.length === 0 ? (
        <li className={`${SETTINGS_BLOCK_CLASS} text-sm text-[#606266]`}>
          No setters or closers have been added yet.
        </li>
      ) : (
        members.map((member) => (
          <li key={member.email} className={ROW_CLASS}>
            <MemberIdentity
              email={member.email}
              detail={`Added ${formatAddedDate(member.addedAt)}`}
            />

            {canManage ? (
              <div className="flex shrink-0 items-center gap-1 pl-12 sm:pl-0">
                <form action={updateRoleAction} className="w-32">
                  <input type="hidden" name="email" value={member.email} />
                  <TeamRoleDropdown
                    name="role"
                    defaultValue={member.role}
                    submitOnChange
                  />
                </form>
                <form action={removeMemberAction}>
                  <input type="hidden" name="email" value={member.email} />
                  <button
                    type="submit"
                    className={`${SETTINGS_ICON_BUTTON_CLASS} [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-600`}
                    aria-label={`Remove ${member.email}`}
                    title="Remove member"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </form>
              </div>
            ) : (
              <span
                className={`${ROLE_PILL_CLASS} ml-12 w-fit bg-[#F3F0FF] text-[#8771FF] sm:ml-0`}
              >
                {member.role}
              </span>
            )}
          </li>
        ))
      )}
    </ul>
  );
}
