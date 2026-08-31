"use client";

import { CheckCircle2, CircleAlert, Plus, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Button } from "@/components/ui/Button";
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

  const handleSubmit = async (event: React.FormEvent) => {
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
      const data = (await res.json().catch(() => null)) as {
        blockedUsername?: BlockedUsernameRow;
        error?: string;
      } | null;

      if (!res.ok || !data?.blockedUsername) {
        throw new Error(data?.error || "Failed to block username.");
      }

      setBlockedUsernames((current) => [
        data.blockedUsername as BlockedUsernameRow,
        ...current.filter(
          (row) =>
            row.username.toLowerCase() !==
            (data.blockedUsername as BlockedUsernameRow).username.toLowerCase(),
        ),
      ]);
      setUsernameInput("");
      setSuccessMessage(`@${data.blockedUsername.username} is now blocked.`);
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
    <div className="space-y-4">
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          <CircleAlert size={16} />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <SettingsSectionCard
        title="Blocked accounts"
        description="Messages from these Instagram usernames never reach your inbox."
      >
        <form
          onSubmit={handleSubmit}
          className="border-b border-[#F0F2F6] px-6 py-6 md:px-8"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
            <ShieldOff className="h-4 w-4 text-[#8771FF]" />
            Block a username
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label
                htmlFor="blocked-username"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Instagram username
              </label>
              <input
                id="blocked-username"
                name="blocked-username"
                type="text"
                value={usernameInput}
                maxLength={MAX_USERNAME_LENGTH}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="e.g. spam_account_123"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <Button
              type="submit"
              className="h-12 w-full md:w-auto"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              leftIcon={<Plus size={16} />}
            >
              Block
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#606266]">
            Friends, family, or known spam accounts — future messages from them
            won't create a conversation in your inbox.
          </p>
        </form>

        <div className="px-6 py-6 md:px-8">
          {blockedUsernames.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9B9DA5]">
              No blocked accounts yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0F2F6]">
              {blockedUsernames.map((row) => (
                <li
                  key={row.username}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm font-medium text-[#101011]">
                    @{row.username}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(row.username)}
                    disabled={removingUsername === row.username}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#9B9DA5] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Unblock @${row.username}`}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
