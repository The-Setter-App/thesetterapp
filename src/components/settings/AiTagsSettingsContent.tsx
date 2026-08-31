"use client";

import { CheckCircle2, CircleAlert, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { Button } from "@/components/ui/Button";
import type { AiTagRow } from "@/lib/aiTagsRepository";
import { normalizeStatusColorHex } from "@/lib/status/config";

interface AiTagsSettingsContentProps {
  initialAiTags: AiTagRow[];
}

const MAX_NAME_LENGTH = 40;
const MAX_CRITERIA_LENGTH = 400;
const DEFAULT_COLOR_HEX = "#8771FF";

export default function AiTagsSettingsContent({
  initialAiTags,
}: AiTagsSettingsContentProps) {
  const [aiTags, setAiTags] = useState(initialAiTags);
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("");
  const [colorHex, setColorHex] = useState(DEFAULT_COLOR_HEX);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = name.trim().length > 0 && criteria.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/settings/ai-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, criteria, colorHex }),
      });
      const data = (await res.json().catch(() => null)) as {
        aiTag?: AiTagRow;
        error?: string;
      } | null;

      if (!res.ok || !data?.aiTag) {
        throw new Error(data?.error || "Failed to create AI tag.");
      }

      setAiTags((current) => [data.aiTag as AiTagRow, ...current]);
      setName("");
      setCriteria("");
      setColorHex(DEFAULT_COLOR_HEX);
      setSuccessMessage(
        `"${data.aiTag.name}" will now be applied automatically.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create AI tag.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tag: AiTagRow) => {
    if (deletingId) return;

    setDeletingId(tag.id);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(
        `/api/settings/ai-tags/${encodeURIComponent(tag.id)}`,
        {
          method: "DELETE",
        },
      );
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to delete AI tag.");
      }

      setAiTags((current) => current.filter((row) => row.id !== tag.id));
      setSuccessMessage(`"${tag.name}" removed.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete AI tag.",
      );
    } finally {
      setDeletingId(null);
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
        title="AI tags"
        description="Describe a criteria once and AI labels every matching conversation automatically — hot lead, price shopper, time waster."
      >
        <form
          onSubmit={handleSubmit}
          className="border-b border-[#F0F2F6] px-6 py-6 md:px-8"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#101011]">
            <Sparkles className="h-4 w-4 text-[#8771FF]" />
            Add AI tag
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_100px_auto] md:items-end">
            <div>
              <label
                htmlFor="ai-tag-name"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Tag name
              </label>
              <input
                id="ai-tag-name"
                type="text"
                value={name}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setName(event.target.value)}
                placeholder="Hot lead"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <div>
              <label
                htmlFor="ai-tag-criteria"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                What should AI look for?
              </label>
              <input
                id="ai-tag-criteria"
                type="text"
                value={criteria}
                maxLength={MAX_CRITERIA_LENGTH}
                onChange={(event) => setCriteria(event.target.value)}
                placeholder="Lead is asking about price and seems ready to buy soon"
                className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3 text-sm text-[#101011] outline-none transition-colors placeholder:text-[#9B9DA5] hover:bg-[#F8F7FF]"
              />
            </div>

            <div>
              <label
                htmlFor="ai-tag-color"
                className="mb-1 block text-xs font-medium text-[#606266]"
              >
                Color
              </label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-[#F0F2F6] bg-white px-2.5">
                <input
                  id="ai-tag-color"
                  type="color"
                  value={normalizeStatusColorHex(colorHex) || DEFAULT_COLOR_HEX}
                  onChange={(event) => setColorHex(event.target.value)}
                  className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full md:w-auto"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              leftIcon={<Plus size={16} />}
            >
              Add
            </Button>
          </div>

          <p className="mt-3 text-xs text-[#606266]">
            AI re-checks a conversation shortly after each new message from the
            lead and applies any tags that match.
          </p>
        </form>

        <div className="px-6 py-6 md:px-8">
          {aiTags.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9B9DA5]">
              No AI tags yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0F2F6]">
              {aiTags.map((tag) => (
                <li
                  key={tag.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.colorHex }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#101011]">
                        {tag.name}
                      </p>
                      <p className="truncate text-xs text-[#9B9DA5]">
                        {tag.criteria}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(tag)}
                    disabled={deletingId === tag.id}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9B9DA5] transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remove ${tag.name}`}
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
