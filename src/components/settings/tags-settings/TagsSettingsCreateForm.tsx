"use client";

import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import TagFields from "./TagFields";
import type { TagsSettingsCreateFormState } from "./types";

interface TagsSettingsCreateFormProps {
  createForm: TagsSettingsCreateFormState;
  onClose: () => void;
}

export default function TagsSettingsCreateForm({
  createForm,
  onClose,
}: TagsSettingsCreateFormProps) {
  return (
    <form
      onSubmit={async (event) => {
        const created = await createForm.onSubmit(event);
        if (created) onClose();
      }}
      className={`${SETTINGS_BLOCK_CLASS} space-y-4 border-b border-[#F0F2F6] bg-[#F8F7FF]`}
    >
      <TagFields idPrefix="new-status" fields={createForm} />

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={createForm.isSubmitting}
          className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full !bg-white md:w-auto`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!createForm.canSubmit}
          className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full md:w-auto`}
        >
          {createForm.isSubmitting ? "Adding…" : "Add status"}
        </button>
      </div>
    </form>
  );
}
