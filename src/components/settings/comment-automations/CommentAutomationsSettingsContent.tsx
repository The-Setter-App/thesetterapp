"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import CommentAutomationForm from "@/components/settings/comment-automations/CommentAutomationForm";
import CommentAutomationRow from "@/components/settings/comment-automations/CommentAutomationRow";
import { useCommentAutomations } from "@/components/settings/comment-automations/useCommentAutomations";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import type { CommentAutomationWithDetails } from "@/lib/commentAutomationsRepository";

interface CommentAutomationsSettingsContentProps {
  initialAutomations: CommentAutomationWithDetails[];
}

export default function CommentAutomationsSettingsContent({
  initialAutomations,
}: CommentAutomationsSettingsContentProps) {
  const {
    automations,
    pendingId,
    successMessage,
    errorMessage,
    createAutomation,
    toggleEnabled,
    removeAutomation,
    setVariants,
  } = useCommentAutomations(initialAutomations);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-3">
      {successMessage ? (
        <SettingsNotice tone="success">{successMessage}</SettingsNotice>
      ) : null}
      {errorMessage ? (
        <SettingsNotice tone="error">{errorMessage}</SettingsNotice>
      ) : null}

      <SettingsSectionCard
        id="comment-automations"
        title="Comment automations"
        description="Send an automatic direct message when someone comments on a post or reel."
        action={
          isFormOpen ? null : (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              <Plus size={16} aria-hidden="true" />
              New automation
            </button>
          )
        }
      >
        {isFormOpen ? (
          <CommentAutomationForm
            onCreate={createAutomation}
            onClose={() => setIsFormOpen(false)}
          />
        ) : null}

        {automations.length === 0 ? (
          <p className={`${SETTINGS_BLOCK_CLASS} text-sm text-[#606266]`}>
            No automations yet. Add one to reply to comments by direct message.
          </p>
        ) : (
          <ul className="divide-y divide-[#F0F2F6]">
            {automations.map((automation) => (
              <CommentAutomationRow
                key={automation.id}
                automation={automation}
                isPending={pendingId === automation.id}
                onToggleEnabled={toggleEnabled}
                onDelete={removeAutomation}
                onVariantsChange={setVariants}
              />
            ))}
          </ul>
        )}
      </SettingsSectionCard>
    </div>
  );
}
