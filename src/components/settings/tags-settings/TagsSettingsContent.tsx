"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { SETTINGS_SECONDARY_BUTTON_CLASS } from "@/components/settings/settingsStyles";
import StatusIconPickerModal from "./StatusIconPickerModal";
import TagsList from "./TagsList";
import TagsSettingsCreateForm from "./TagsSettingsCreateForm";
import type { TagsSettingsContentProps } from "./types";
import { useTagsSettingsController } from "./useTagsSettingsController";

export default function TagsSettingsContent(props: TagsSettingsContentProps) {
  const { allTags, messages, createForm, editForm, iconPicker } =
    useTagsSettingsController(props);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <StatusIconPickerModal
        open={iconPicker.open}
        selectedIconPack={iconPicker.selectedIconPack}
        selectedIconName={iconPicker.selectedIconName}
        onClose={iconPicker.close}
        onSelect={iconPicker.onSelect}
      />

      {messages.successMessage ? (
        <SettingsNotice tone="success">
          {messages.successMessage}
        </SettingsNotice>
      ) : null}
      {messages.errorMessage ? (
        <SettingsNotice tone="error">{messages.errorMessage}</SettingsNotice>
      ) : null}

      <SettingsSectionCard
        title="Statuses"
        badge={String(allTags.length)}
        description="Every lead sits in one of these. Setter AI reads each description and moves a lead along when a conversation clearly matches, and you can always change it by hand."
        action={
          isCreateOpen ? null : (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              <Plus size={16} aria-hidden="true" />
              New status
            </button>
          )
        }
      >
        {isCreateOpen ? (
          <TagsSettingsCreateForm
            createForm={createForm}
            onClose={() => setIsCreateOpen(false)}
          />
        ) : null}
        <TagsList allTags={allTags} editForm={editForm} />
      </SettingsSectionCard>
    </div>
  );
}
