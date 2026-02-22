export type TagCategory =
  | "Lead Stage"
  | "Priority"
  | "Intent"
  | "Follow Up"
  | "Custom";

export type TagSource = "Preset" | "Custom";

export interface TagRow {
  id: string;
  name: string;
  category: TagCategory;
  description: string;
  source: TagSource;
  inboxStatus: "Not wired yet";
  createdBy: string;
  createdAt: string;
}

export interface WorkspaceCustomTag {
  id: string;
  workspaceOwnerEmail: string;
  normalizedName: string;
  name: string;
  category: TagCategory;
  description: string;
  source: "Custom";
  inboxStatus: "Not wired yet";
  createdByEmail: string;
  createdByLabel: string;
  createdAt: Date;
  updatedAt: Date;
}
