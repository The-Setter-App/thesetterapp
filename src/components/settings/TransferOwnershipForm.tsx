"use client";

import { useState } from "react";
import type { TeamMemberRole } from "@/types/auth";
import TeamRoleDropdown from "./TeamRoleDropdown";

interface TransferOwnershipFormProps {
  members: Array<{ email: string; role: TeamMemberRole }>;
  action: (formData: FormData) => void;
}

export default function TransferOwnershipForm({
  members,
  action,
}: TransferOwnershipFormProps) {
  const [newOwnerEmail, setNewOwnerEmail] = useState(
    members[0]?.email ?? "",
  );
  const [confirmText, setConfirmText] = useState("");

  const isConfirmed =
    confirmText.trim().toLowerCase() === newOwnerEmail.toLowerCase() &&
    newOwnerEmail.length > 0;

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="transfer-new-owner"
            className="mb-1 block text-xs font-medium text-[#606266]"
          >
            New owner
          </label>
          <select
            id="transfer-new-owner"
            name="newOwnerEmail"
            value={newOwnerEmail}
            onChange={(event) => {
              setNewOwnerEmail(event.target.value);
              setConfirmText("");
            }}
            className="h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-[#101011] outline-none"
          >
            {members.map((member) => (
              <option key={member.email} value={member.email}>
                {member.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="transfer-previous-role"
            className="mb-1 block text-xs font-medium text-[#606266]"
          >
            Your new role after transfer
          </label>
          <TeamRoleDropdown name="previousOwnerNewRole" defaultValue="closer" />
        </div>
      </div>

      <div>
        <label
          htmlFor="transfer-confirm"
          className="mb-1 block text-xs font-medium text-[#606266]"
        >
          Type {newOwnerEmail || "the new owner's email"} to confirm
        </label>
        <input
          id="transfer-confirm"
          type="text"
          autoComplete="off"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={newOwnerEmail}
          className="h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm text-[#101011] outline-none placeholder:text-[#D4A5A5]"
        />
      </div>

      <button
        type="submit"
        disabled={!isConfirmed}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Transfer ownership
      </button>
    </form>
  );
}
