import { UserPlus } from "lucide-react";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import TeamRoleDropdown from "@/components/settings/team/TeamRoleDropdown";

interface TeamInviteFormProps {
  action: (formData: FormData) => void;
}

export default function TeamInviteForm({ action }: TeamInviteFormProps) {
  return (
    <form
      action={action}
      className={`${SETTINGS_BLOCK_CLASS} border-b border-[#F0F2F6]`}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_10rem_auto] md:items-end">
        <div>
          <label htmlFor="team-member-email" className={SETTINGS_LABEL_CLASS}>
            Invite by email
          </label>
          <input
            id="team-member-email"
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
            className={SETTINGS_INPUT_CLASS}
          />
        </div>

        <div>
          <p className={SETTINGS_LABEL_CLASS}>Role</p>
          <TeamRoleDropdown name="role" defaultValue="setter" />
        </div>

        <button
          type="submit"
          className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full md:w-auto`}
        >
          <UserPlus size={15} aria-hidden="true" />
          Send invite
        </button>
      </div>
    </form>
  );
}
