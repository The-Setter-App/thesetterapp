"use client";

import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import StatusIconPickerModal from "@/components/settings/StatusIconPickerModal";
import TagsSettingsAlerts from "@/components/settings/tags-settings/TagsSettingsAlerts";
import TagsSettingsCreateForm from "@/components/settings/tags-settings/TagsSettingsCreateForm";
import TagsSettingsSummaryMetrics from "@/components/settings/tags-settings/TagsSettingsSummaryMetrics";
import TagsTable from "@/components/settings/tags-settings/TagsTable";
import type { TagsSettingsContentProps } from "@/components/settings/tags-settings/types";
import { useTagsSettingsController } from "@/components/settings/tags-settings/useTagsSettingsController";

export default function TagsSettingsContent(props: TagsSettingsContentProps) {
  const { allTags, customTags, messages, createForm, editForm, iconPicker } =
    useTagsSettingsController(props);

  return (
    <div className="space-y-4">
      <StatusIconPickerModal
        open={iconPicker.open}
        selectedIconPack={iconPicker.selectedIconPack}
        selectedIconName={iconPicker.selectedIconName}
        onClose={iconPicker.close}
        onSelect={iconPicker.onSelect}
      />

      <TagsSettingsAlerts messages={messages} />

      <SettingsSectionCard
        title="Status tags"
        description="Manage default and custom statuses used in Inbox and Leads."
      >
        <TagsSettingsSummaryMetrics
          totalTags={allTags.length}
          customTagsCount={customTags.length}
        />

        <TagsSettingsCreateForm createForm={createForm} />

        <div className="px-6 py-6 md:px-8">
          <TagsTable allTags={allTags} editForm={editForm} />
        </div>
      </SettingsSectionCard>
    </div>
  );
}