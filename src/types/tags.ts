export type TagSource = "Default" | "Custom";

export type TagIconPack = "lu" | "fa6";

export interface TagRow {
  id: string;
  name: string;
  description: string;
  source: TagSource;
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
  createdBy: string;
  createdAt: string;
}

export interface WorkspaceCustomTag {
  id: string;
  workspaceOwnerEmail: string;
  normalizedName: string;
  name: string;
  description: string;
  source: "Custom";
  colorHex: string;
  iconPack: TagIconPack;
  iconName: string;
  createdByEmail: string;
  createdByLabel: string;
  createdAt: Date;
  updatedAt: Date;
}
