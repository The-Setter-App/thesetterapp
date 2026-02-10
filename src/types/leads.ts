export type StatusType = 'Won' | 'Unqualified' | 'Booked' | 'New Lead' | 'Qualified' | 'No-Show' | 'In-Contact' | 'Retarget';

export interface Lead {
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
  selected?: boolean;
}

export type SortConfig = {
  key: keyof Lead;
  direction: 'asc' | 'desc';
} | null;