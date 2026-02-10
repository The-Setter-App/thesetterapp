export type StatusType = 'Won' | 'Unqualified' | 'Booked' | 'New Lead' | 'Qualified' | 'No-Show' | 'In-Contact' | 'Retarget';

export interface User {
  id: number;
  name: string;
  time: string;
  lastMessage: string;
  status: StatusType;
  statusColor: string;
  icon: string;
  avatar: string | null;
  verified: boolean;
  unread?: number;
  isActive?: boolean;
}

export interface Message {
  id: number;
  fromMe: boolean;
  type: string;
  text?: string;
  duration?: string;
  status?: string;
}