"use client";

import { type FormEvent, useState } from "react";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import type { BlockedUsernameRow } from "@/lib/blockedUsernamesRepository";

interface BlockedUsersSettingsContentProps {
  initialBlockedUsernames: BlockedUsernameRow[];
}

const MAX_USERNAME_LENGTH = 60;

export default function BlockedUsersSettingsContent({
  initialBlockedUsernames,
}: BlockedUsersSettingsContentProps) {
  const [blockedUsernames, setBlockedUsernames] = useState(
    initialBlockedUsernames,
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = usernameInput.trim().replace(/^@+/, "").length > 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/settings/blocked-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput }),
      });
      const data: {
        blockedUsername?: BlockedUsernameRow;
        error?: string;
      } | null = await res.json().catch(() => null);
      const blocked = data?.blockedUsername;

      if (!res.ok || !blocked) {
        throw new Error(data?.error || "Failed to block username.");
      }

      setBlockedUsernames((current) => [
        blocked,
        ...current.filter(
          (row) =>
            row.username.toLowerCase() !== blocked.username.toLowerCase(),
        ),
      ]);
      setUsernameInput("");
      setSuccessMessage(`@${blocked.username} is now blocked.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to block username.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (username: string) => {
    if (removingUsername) return;

    setRemovingUsername(username);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/settings/blocked-users/${encodeURIComponent(username)}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to unblock username.");
      }

      setBlockedUsernames((current) =>
        current.filter((row) => row.username !== username),
      );
      setSuccessMessage(`@${username} is unblocked.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to unblock username.",
      );
    } finally {
      setRemovingUsername(null);
    }
  };

  return (
    <div className="space-y-3">
      {successMessage ? (
        <SettingsNotice tone="success">{successMessage}</SettingsNotice>
      ) : null}
      {errorMessage ? (
        <SettingsNotice tone="error">{errorMessage}</SettingsNotice>
      ) : null}

      <SettingsSectionCard
        id="blocked-accounts"
        title="Blocked accounts"
        description="Messages from these Instagram usernames never reach your inbox. Useful for friends, family and known spam."
      >
        <form
          onSubmit={handleSubmit}
          className={`${SETTINGS_BLOCK_CLASS} border-b border-[#F0F2F6]`}
        >
          <label htmlFor="blocked-username" className={SETTINGS_LABEL_CLASS}>
            Instagram username
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="blocked-username"
              name="blocked-username"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={usernameInput}
              maxLength={MAX_USERNAME_LENGTH}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="spam_account_123"
              className={`${SETTINGS_INPUT_CLASS} sm:flex-1`}
            />
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              {isSubmitting ? "Blocking…" : "Block"}
            </button>
          </div>
        </form>

        {blockedUsernames.length === 0 ? (
          <p className={`${SETTINGS_BLOCK_CLASS} text-sm text-[#606266]`}>
            No blocked accounts yet.
          </p>
        ) : (
          <ul className="divide-y divide-[#F0F2F6]">
            {blockedUsernames.map((row) => (
              <li
                key={row.username}
                className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-3 !py-2`}
              >
                <span className="min-w-0 truncate text-[0.9375rem] font-medium text-[#101011]">
                  @{row.username}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(row.username)}
                  disabled={removingUsername === row.username}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#F4F5F8] [@media(hover:hover)]:hover:text-[#101011]"
                >
                  Unblock
                  <span className="sr-only"> @{row.username}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSectionCard>
    </div>
  );
}
