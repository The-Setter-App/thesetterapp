"use client";

import { type FormEvent, useState } from "react";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_HINT_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
  SETTINGS_TEXTAREA_CLASS,
} from "@/components/settings/settingsStyles";

interface ReplyPlaybookSectionProps {
  initialInstructions: string;
  // Kept in step with the limit the server enforces.
  maxLength: number;
}

const PLACEHOLDER = [
  "What you sell and who it is for.",
  "What makes a lead qualified (budget, timeline, who decides).",
  "How you handle the common objections.",
  "The tone to write in, and anything the team must never say.",
].join("\n");

function readErrorMessage(body: unknown): string {
  const fallback = "Could not save the playbook.";
  if (!body || typeof body !== "object") return fallback;
  const message: unknown = (body as { error?: unknown }).error;
  return typeof message === "string" && message ? message : fallback;
}

// The owner's instructions for how the team sells. Every suggested reply in
// the inbox is drafted with these in hand.
export default function ReplyPlaybookSection({
  initialInstructions,
  maxLength,
}: ReplyPlaybookSectionProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [savedInstructions, setSavedInstructions] =
    useState(initialInstructions);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges = instructions.trim() !== savedInstructions.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/settings/reply-playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readErrorMessage(body));
      }

      const saved = instructions.trim();
      setInstructions(saved);
      setSavedInstructions(saved);
      setSuccessMessage(
        saved
          ? "Playbook saved. New suggested replies will follow it."
          : "Playbook cleared.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not save the playbook.",
      );
    } finally {
      setIsSaving(false);
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
        id="reply-playbook"
        title="Reply playbook"
        description="How your team sells, in your own words. Suggested replies in the inbox are drafted to follow it."
      >
        <form onSubmit={handleSubmit} className={SETTINGS_BLOCK_CLASS}>
          <label htmlFor="reply-playbook" className="sr-only">
            Reply playbook
          </label>
          <textarea
            id="reply-playbook"
            value={instructions}
            maxLength={maxLength}
            rows={9}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={PLACEHOLDER}
            className={SETTINGS_TEXTAREA_CLASS}
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={`${SETTINGS_HINT_CLASS} !mt-0 tabular-nums`}>
              {instructions.length.toLocaleString()} of{" "}
              {maxLength.toLocaleString()} characters. Leave prices and links
              out unless you want them offered to leads.
            </p>
            <button
              type="submit"
              disabled={!hasChanges || isSaving}
              className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full shrink-0 sm:w-auto`}
            >
              {isSaving ? "Saving…" : "Save playbook"}
            </button>
          </div>
        </form>
      </SettingsSectionCard>
    </div>
  );
}
