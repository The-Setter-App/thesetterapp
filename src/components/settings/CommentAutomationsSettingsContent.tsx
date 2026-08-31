"use client";

import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  MessageSquareText,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Button } from "@/components/ui/Button";
import type {
  CommentAutomationVariant,
  CommentAutomationWithDetails,
  VariantConversionStats,
} from "@/lib/commentAutomationsRepository";

interface CommentAutomationsSettingsContentProps {
  initialAutomations: CommentAutomationWithDetails[];
}

const MAX_NAME_LENGTH = 60;
const MAX_KEYWORD_LENGTH = 60;
const MAX_MEDIA_ID_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1000;

function rate(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function VariantStatsRow({
  label,
  stats,
}: {
  label: string;
  stats: VariantConversionStats | undefined;
}) {
  const sent = stats?.sent ?? 0;
  const replied = stats?.replied ?? 0;
  const qualified = stats?.qualified ?? 0;
  const booked = stats?.booked ?? 0;

  return (
    <tr className="border-t border-[#F0F2F6]">
      <td className="py-2 pr-3 text-xs font-medium text-[#101011]">{label}</td>
      <td className="py-2 pr-3 text-xs text-[#606266]">{sent}</td>
      <td className="py-2 pr-3 text-xs text-[#606266]">
        {replied} ({rate(replied, sent)})
      </td>
      <td className="py-2 pr-3 text-xs text-[#606266]">
        {qualified} ({rate(qualified, sent)})
      </td>
      <td className="py-2 text-xs text-[#606266]">
        {booked} ({rate(booked, sent)})
      </td>
    </tr>
  );
}

function AutomationRow({
  automation,
  onToggleEnabled,
  onDelete,
  onVariantsChange,
  pendingId,
}: {
  automation: CommentAutomationWithDetails;
  onToggleEnabled: (automation: CommentAutomationWithDetails) => void;
  onDelete: (automation: CommentAutomationWithDetails) => void;
  onVariantsChange: (
    automationId: string,
    variants: CommentAutomationVariant[],
  ) => void;
  pendingId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [variantMessage, setVariantMessage] = useState("");
  const [variantWeight, setVariantWeight] = useState(1);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [variantError, setVariantError] = useState("");

  const handleAddVariant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!variantMessage.trim() || isAddingVariant) return;

    setIsAddingVariant(true);
    setVariantError("");

    try {
      const res = await fetch(
        `/api/settings/comment-automations/${encodeURIComponent(automation.id)}/variants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: variantMessage,
            weight: variantWeight,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        variant?: CommentAutomationVariant;
        error?: string;
      } | null;
      if (!res.ok || !data?.variant) {
        throw new Error(data?.error || "Failed to add variant.");
      }
      onVariantsChange(automation.id, [...automation.variants, data.variant]);
      setVariantMessage("");
      setVariantWeight(1);
    } catch (error) {
      setVariantError(
        error instanceof Error ? error.message : "Failed to add variant.",
      );
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variant: CommentAutomationVariant) => {
    setVariantError("");
    try {
      const res = await fetch(
        `/api/settings/comment-automations/${encodeURIComponent(automation.id)}/variants/${encodeURIComponent(variant.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Failed to remove variant.");
      }
      onVariantsChange(
        automation.id,
        automation.variants.filter((row) => row.id !== variant.id),
      );
    } catch (error) {
      setVariantError(
        error instanceof Error ? error.message : "Failed to remove variant.",
      );
    }
  };

  const statsByVariant = new Map(
    automation.stats.map((row) => [row.variantId, row]),
  );

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#9B9DA5] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#101011]">
              {automation.name}
            </p>
            <p className="truncate text-xs text-[#9B9DA5]">
              {automation.keyword
                ? `Keyword "${automation.keyword}"`
                : "Any comment"}
              {" · "}
              {automation.mediaId ? `Media ${automation.mediaId}` : "All posts"}
              {" · "}
              {automation.triggerCount} sent
              {automation.variants.length > 0
                ? ` · ${automation.variants.length} variants`
                : ""}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleEnabled(automation)}
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
            onClick={() => onDelete(automation)}
            disabled={pendingId === automation.id}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#9B9DA5] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Remove ${automation.name}`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="ml-6 mt-3 space-y-4 rounded-xl border border-[#F0F2F6] bg-[#FAFBFD] p-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-[#101011]">
              Message variants
            </p>
            <p className="mb-2 text-xs text-[#606266]">
              Add more than one message to split-test which one converts best.
              Each new comment is randomly assigned a variant, weighted by the
              number you set. With none added, every comment gets the single
              message above.
            </p>

            {automation.variants.length > 0 && (
              <ul className="mb-3 space-y-2">
                {automation.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#F0F2F6] bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[#101011]">
                        {variant.message}
                      </p>
                      <p className="text-[10px] text-[#9B9DA5]">
                        Weight {variant.weight} · {variant.triggerCount} sent
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVariant(variant)}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#9B9DA5] hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove variant"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {variantError && (
              <p className="mb-2 text-xs text-red-600">{variantError}</p>
            )}

            <form onSubmit={handleAddVariant} className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={variantMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(event) => setVariantMessage(event.target.value)}
                  placeholder="Alternate message to test"
                  className="h-9 w-full rounded-lg border border-[#F0F2F6] bg-white px-2.5 text-xs text-[#101011] outline-none placeholder:text-[#9B9DA5]"
                />
              </div>
              <input
                type="number"
                min={1}
                max={10}
                value={variantWeight}
                onChange={(event) =>
                  setVariantWeight(Number.parseInt(event.target.value, 10) || 1)
                }
                className="h-9 w-14 rounded-lg border border-[#F0F2F6] bg-white px-2 text-center text-xs text-[#101011] outline-none"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!variantMessage.trim()}
                isLoading={isAddingVariant}
              >
                Add
              </Button>
            </form>
          </div>

          {automation.stats.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[#101011]">
                Performance
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="pb-1 pr-3 text-left text-[10px] font-medium uppercase text-[#9B9DA5]">
                        Variant
                      </th>
                      <th className="pb-1 pr-3 text-left text-[10px] font-medium uppercase text-[#9B9DA5]">
                        Sent
                      </th>
                      <th className="pb-1 pr-3 text-left text-[10px] font-medium uppercase text-[#9B9DA5]">
                        Replied
                      </th>
                      <th className="pb-1 pr-3 text-left text-[10px] font-medium uppercase text-[#9B9DA5]">
                        Qualified
                      </th>
                      <th className="pb-1 text-left text-[10px] font-medium uppercase text-[#9B9DA5]">
                        Booked
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {automation.variants.length === 0 ? (
                      <VariantStatsRow
                        label="Message"
                        stats={statsByVariant.get(null)}
                      />
                    ) : (
                      automation.variants.map((variant, index) => (
                        <VariantStatsRow
                          key={variant.id}
                          label={`Variant ${index + 1}`}
                          stats={statsByVariant.get(variant.id)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

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
        automation?: CommentAutomationWithDetails;
        error?: string;
      } | null;

      if (!res.ok || !data?.automation) {
        throw new Error(data?.error || "Failed to create automation.");
      }

      setAutomations((current) => [
        ...current,
        {
          ...data.automation,
          variants: [],
          stats: [],
        } as CommentAutomationWithDetails,
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

  const handleToggleEnabled = async (
    automation: CommentAutomationWithDetails,
  ) => {
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

  const handleDelete = async (automation: CommentAutomationWithDetails) => {
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

  const handleVariantsChange = (
    automationId: string,
    variants: CommentAutomationVariant[],
  ) => {
    setAutomations((current) =>
      current.map((row) =>
        row.id === automationId ? { ...row, variants } : row,
      ),
    );
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
                <AutomationRow
                  key={automation.id}
                  automation={automation}
                  onToggleEnabled={handleToggleEnabled}
                  onDelete={handleDelete}
                  onVariantsChange={handleVariantsChange}
                  pendingId={pendingId}
                />
              ))}
            </ul>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
