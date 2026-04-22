import type { FormEvent } from "react";
import type { TagIconPack, TagRow } from "@/types/tags";

export interface TagsSettingsCurrentUser {
  email: string;
  displayName?: string;
}

export interface TagsSettingsContentProps {
  currentUser: TagsSettingsCurrentUser;
  initialTags: TagRow[];
}

export interface UpsertTagResponse {
  tag?: TagRow;
  error?: string;
}

export interface DeleteTagResponse {
  success?: boolean;
  error?: string;
}

export type IconPickerContext = "create" | "edit";

export interface IconSelection {
  iconPack: TagIconPack;
  iconName: string;
}

export interface TagsSettingsMessages {
  errorMessage: string;
  successMessage: string;
}

export interface TagsSettingsCreateFormState {
  tagName: string;
  tagDescription: string;
  tagColorHex: string;
  tagIconPack: TagIconPack;
  tagIconName: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onTagNameChange: (value: string) => void;
  onTagDescriptionChange: (value: string) => void;
  onTagColorHexChange: (value: string) => void;
  openIconPicker: () => void;
}

export interface TagsSettingsEditFormState {
  activeTagId: string | null;
  tagName: string;
  tagDescription: string;
  tagColorHex: string;
  tagIconPack: TagIconPack;
  tagIconName: string;
  isSubmitting: boolean;
  deletingTagId: string | null;
  onTagNameChange: (value: string) => void;
  onTagDescriptionChange: (value: string) => void;
  onTagColorHexChange: (value: string) => void;
  openIconPicker: () => void;
  begin: (tag: TagRow) => void;
  cancel: () => void;
  save: () => Promise<void>;
  remove: (tagId: string) => Promise<void>;
}

export interface TagsSettingsIconPickerState {
  open: boolean;
  selectedIconPack: TagIconPack;
  selectedIconName: string;
  close: () => void;
  onSelect: (selection: IconSelection) => void;
}

export interface UseTagsSettingsControllerResult {
  allTags: TagRow[];
  customTags: TagRow[];
  messages: TagsSettingsMessages;
  createForm: TagsSettingsCreateFormState;
  editForm: TagsSettingsEditFormState;
  iconPicker: TagsSettingsIconPickerState;
}