"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import CommentAutomationStats from "@/components/settings/comment-automations/CommentAutomationStats";
import CommentAutomationVariants from "@/components/settings/comment-automations/CommentAutomationVariants";
import SettingsSwitch from "@/components/settings/SettingsSwitch";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_ICON_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import type {
  CommentAutomationVariant,
  CommentAutomationWithDetails,
} from "@/lib/commentAutomationsRepository";

interface CommentAutomationRowProps {
  automation: CommentAutomationWithDetails;
  // True while this automation's toggle or delete is being saved.
  isPending: boolean;
  onToggleEnabled: (automation: CommentAutomationWithDetails) => void;
  onDelete: (automation: CommentAutomationWithDetails) => void;
  onVariantsChange: (
    automationId: string,
    variants: CommentAutomationVariant[],
  ) => void;
}

function describeTrigger(automation: CommentAutomationWithDetails): string {
  const parts = [
    automation.keyword ? `Keyword “${automation.keyword}”` : "Any comment",
    automation.mediaId ? `Media ${automation.mediaId}` : "All posts",
    `${automation.triggerCount} sent`,
  ];
  if (automation.variants.length > 0) {
    parts.push(
      `${automation.variants.length} ${automation.variants.length === 1 ? "variant" : "variants"}`,
    );
  }
  return parts.join(" · ");
}

export default function CommentAutomationRow({
  automation,
  isPending,
  onToggleEnabled,
  onDelete,
  onVariantsChange,
}: CommentAutomationRowProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <li>
      <div
        className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-2 !py-2.5`}
      >
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left outline-none"
        >
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-[#9A9CA2] transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          />
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-medium text-[#101011]">
              {automation.name}
            </span>
            <span className="block truncate text-xs tabular-nums text-[#9A9CA2]">
              {describeTrigger(automation)}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <SettingsSwitch
            checked={automation.enabled}
            onChange={() => onToggleEnabled(automation)}
            disabled={isPending}
            label={`${automation.name} is ${automation.enabled ? "on" : "off"}`}
          />
          <button
            type="button"
            onClick={() => onDelete(automation)}
            disabled={isPending}
            aria-label={`Remove ${automation.name}`}
            className={`${SETTINGS_ICON_BUTTON_CLASS} [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-600`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div
          id={panelId}
          className={`${SETTINGS_BLOCK_CLASS} space-y-6 border-t border-[#F0F2F6] bg-[#F8F7FF]`}
        >
          <div>
            <p className="text-sm font-semibold text-[#101011]">Message</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#606266]">
              {automation.replyMessage}
            </p>
          </div>

          <CommentAutomationVariants
            automationId={automation.id}
            variants={automation.variants}
            onChange={(variants) => onVariantsChange(automation.id, variants)}
          />

          {automation.stats.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-[#101011]">
                Performance
              </p>
              <CommentAutomationStats
                variants={automation.variants}
                stats={automation.stats}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
