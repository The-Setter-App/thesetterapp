"use client";

import {
  CheckCircle2,
  CircleAlert,
  MessageSquareText,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Button } from "@/components/ui/Button";
import type { CommentAutomation } from "@/lib/commentAutomationsRepository";

interface CommentAutomationsSettingsContentProps {
  initialAutomations: CommentAutomation[];
}

const MAX_NAME_LENGTH = 60;
const MAX_KEYWORD_LENGTH = 60;
const MAX_MEDIA_ID_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1000;

export default function CommentAutomationsSettingsContent({
  initialAutomations,
}: CommentAutomationsSettingsContentProps) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [name, setName] = useState("");
  const [keyword, setKeyword] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = name.trim().length > 0 && replyMessage.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/settings/comment-automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, keyword, mediaId, replyMessage }),
      });
      const data = (await res.json().catch(() => null)) as {
        automation?: CommentAutomation;
        error?: string;
      } | null;

      if (!res.ok || !data?.automation) {
        throw new Error(data?.error || "Failed to create automation.");
      }

      setAutomations((current) => [
        ...current,
        data.automation as CommentAutomation,
      ]);
      setName("");
      setKeyword("");
      setMediaId("");
      setReplyMessage("");
      setSuccessMessage(`"${data.automation.name}" is live.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create automation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEnabled = async (automation: CommentAutomation) => {
    if (pendingId) return;
    const nextEnabled = !automation.enabled;

    setPendingId(automation.id);
    setErrorMessage("");
    setAutomations((current) =>
      current.map((row) =>
        row.id === automation.id ? { ...row, enabled: nextEnabled } : row,
      ),
    );

    try {
      const res = await fetch(
        `/api/settings/comment-automations/${encodeURIComponent(automation.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Failed to update automation.");
      }
    } catch (error) {
      setAutomations((current) =>
        current.map((row) =>
          row.id === automation.id
            ? { ...row, enabled: automation.enabled }
            : row,
        ),
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update automation.",
      );
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (automation: CommentAutomation) => {
    if (pendingId) return;

    setPendingId(automation.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/settings/comment-automations/${encodeURIComponent(automation.id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to delete automation.");
      }
      setAutomations((current) =>
        current.filter((row) => row.id !== automation.id),
      );
      setSuccessMessage(`"${automation.name}" removed.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete automation.",
      );
    } finally {
      setPendingId(null);
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
        title="Comment automations"
        description="Comment a keyword on a post or reel and get an automatic DM back — your ManyChat replacement. Leave the keyword blank to match every comment, and the media ID blank to apply across all your posts."
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-3 border-b border-[#F0F2F6] px-6 py-6 md:px-8"
        >
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#101011]">
            <MessageSquareText className="h-4 w-4 text-[#8771FF]" />
            Add automation
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label
                htmlFor="automation-name"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Name
              </label>
              <input
                id="automation-name"
                type="text"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setName(event.target.value)}
                placeholder="PDF giveaway"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <div>
              <label
                htmlFor="automation-keyword"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Trigger keyword (optional)
              </label>
              <input
                id="automation-keyword"
                type="text"
                value={keyword}
                maxLength={MAX_KEYWORD_LENGTH}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="PDF"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <div>
              <label
                htmlFor="automation-media-id"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Post/reel media ID (optional)
              </label>
              <input
                id="automation-media-id"
                type="text"
                value={mediaId}
                maxLength={MAX_MEDIA_ID_LENGTH}
                onChange={(event) => setMediaId(event.target.value)}
                placeholder="All posts"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="automation-reply"
              className="mb-1 block text-xs font-medium text-[#606266]"
            >
              DM to send
            </label>
            <textarea
              id="automation-reply"
              value={replyMessage}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setReplyMessage(event.target.value)}
              placeholder="Thanks for commenting! Here's your PDF: ..."
              rows={2}
              className="w-full rounded-xl border border-[#F0F2F6] bg-white px-3 py-2 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#606266]">
              Instagram only allows one automated reply per comment, sent within
              7 days of the comment.
            </p>
            <Button
              type="submit"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              leftIcon={<Plus size={16} />}
            >
              Add
            </Button>
          </div>
        </form>

        <div className="px-6 py-6 md:px-8">
          {automations.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9B9DA5]">
              No automations yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0F2F6]">
              {automations.map((automation) => (
                <li
                  key={automation.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#101011]">
                      {automation.name}
                    </p>
                    <p className="truncate text-xs text-[#9B9DA5]">
                      {automation.keyword
                        ? `Keyword "${automation.keyword}"`
                        : "Any comment"}
                      {" · "}
                      {automation.mediaId
                        ? `Media ${automation.mediaId}`
                        : "All posts"}
                      {" · "}
                      {automation.triggerCount} sent
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(automation)}
                      disabled={pendingId === automation.id}
                      aria-pressed={automation.enabled}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        automation.enabled ? "bg-[#8771FF]" : "bg-[#E4E7EC]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          automation.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(automation)}
                      disabled={pendingId === automation.id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#9B9DA5] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${automation.name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
