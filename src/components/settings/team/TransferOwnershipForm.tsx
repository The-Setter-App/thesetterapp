"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
} from "@/components/settings/settingsStyles";
import type { TeamMemberRole } from "@/types/auth";
import TeamRoleDropdown from "./TeamRoleDropdown";

interface TransferOwnershipFormProps {
  members: Array<{ email: string; role: TeamMemberRole }>;
  action: (formData: FormData) => void;
}

const DANGER_BUTTON_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 md:w-auto [@media(hover:hover)]:enabled:hover:bg-red-700";

export default function TransferOwnershipForm({
  members,
  action,
}: TransferOwnershipFormProps) {
  const [newOwnerEmail, setNewOwnerEmail] = useState(members[0]?.email ?? "");
  const [confirmText, setConfirmText] = useState("");

  // The button only unlocks once the new owner's email is typed out in full.
  const isConfirmed =
    newOwnerEmail.length > 0 &&
    confirmText.trim().toLowerCase() === newOwnerEmail.toLowerCase();

  return (
    <form action={action} className={`${SETTINGS_BLOCK_CLASS} space-y-4`}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="transfer-new-owner" className={SETTINGS_LABEL_CLASS}>
            New owner
          </label>
          <div className="relative">
            <select
              id="transfer-new-owner"
              name="newOwnerEmail"
              value={newOwnerEmail}
              onChange={(event) => {
                setNewOwnerEmail(event.target.value);
                setConfirmText("");
              }}
              className={`${SETTINGS_INPUT_CLASS} appearance-none pr-10`}
            >
              {members.map((member) => (
                <option key={member.email} value={member.email}>
                  {member.email}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9A9CA2]"
            />
          </div>
        </div>

        <div>
          <p className={SETTINGS_LABEL_CLASS}>Your role afterwards</p>
          <TeamRoleDropdown name="previousOwnerNewRole" defaultValue="closer" />
        </div>
      </div>

      <div>
        <label htmlFor="transfer-confirm" className={SETTINGS_LABEL_CLASS}>
          Type {newOwnerEmail || "the new owner's email"} to confirm
        </label>
        <input
          id="transfer-confirm"
          type="text"
          autoComplete="off"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={newOwnerEmail}
          className={SETTINGS_INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={!isConfirmed}
        className={DANGER_BUTTON_CLASS}
      >
        Transfer ownership
      </button>
    </form>
  );
}
