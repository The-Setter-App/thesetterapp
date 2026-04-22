import type { StatusType } from "@/types/status";

export type { StatusType };

export interface LeadRow {
  id: string;
  name: string;
  handle?: string;
  messageCount?: number;
  status: StatusType;
  cash: string;
  assignedTo: string;
  assignedRole: string;
  account: string;
  interacted: string;
  avatar?: string | null;
  updatedAtMs?: number;
  selected?: boolean;
}

export type Lead = LeadRow;

export type SortConfig = {
  key: keyof LeadRow;
  direction: "asc" | "desc";
} | null;
