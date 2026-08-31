export type TagSource = "Default" | "Custom";

export type TagIconPack = "lu" | "fa6";

// The semantic role a status plays for features that need to recognize a
// stage regardless of what it's currently named (dashboard funnel, lead
// cooling exclusions, split-test conversion stats, the default status for
// brand-new leads). At most one tag per workspace holds a given role.
export type StatusRole =
  | "new"
  | "in_contact"
  | "qualified"
  | "booked"
  | "won"
  | "unqualified"
  | "no_show"
  | "retarget";

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
  role?: StatusRole | null;
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
  role: StatusRole | null;
  createdByEmail: string;
  createdByLabel: string;
  createdAt: Date;
  updatedAt: Date;
}
