export type CalendarEventType =
  | "call"
  | "follow_up"
  | "demo"
  | "closing"
  | "onboarding";

export interface CalendarEvent {
  id: string;
  title: string;
  leadName: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  startHour: number; // 0-23
  duration: number; // in hours (can be fractional)
  status: "confirmed" | "pending" | "completed" | "cancelled" | "no_show";
  assignedTo: string;
  avatar?: string;
  amount?: string;
}

export const EVENT_TYPE_CONFIG: Record<
  CalendarEventType,
  {
    label: string;
    bgClass: string;
    textClass: string;
    dotClass: string;
    borderClass: string;
  }
> = {
  call: {
    label: "Discovery Call",
    bgClass: "bg-[#F3F0FF]",
    textClass: "text-[#6d5ed6]",
    dotClass: "bg-[#8771FF]",
    borderClass: "border-[#DDD6FF]",
  },
  follow_up: {
    label: "Follow-Up",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    dotClass: "bg-amber-500",
    borderClass: "border-amber-200",
  },
  demo: {
    label: "Demo",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    dotClass: "bg-blue-500",
    borderClass: "border-blue-200",
  },
  closing: {
    label: "Closing Call",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    dotClass: "bg-emerald-500",
    borderClass: "border-emerald-200",
  },
  onboarding: {
    label: "Onboarding",
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    dotClass: "bg-rose-500",
    borderClass: "border-rose-200",
  },
};

export const EVENT_STATUS_CONFIG: Record<
  CalendarEvent["status"],
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  confirmed: {
    label: "Confirmed",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  },
  pending: {
    label: "Pending",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
  completed: {
    label: "Completed",
    bgClass: "bg-[#F3F0FF]",
    textClass: "text-[#6d5ed6]",
    borderClass: "border-[#DDD6FF]",
  },
  cancelled: {
    label: "Cancelled",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
  no_show: {
    label: "No-Show",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
    borderClass: "border-gray-300",
  },
};
