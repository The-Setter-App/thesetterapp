/** Mock calendar events for realistic UI demonstration. */

export type CalendarEventType = "call" | "follow_up" | "demo" | "closing" | "onboarding";

export interface CalendarEvent {
    id: string;
    title: string;
    leadName: string;
    type: CalendarEventType;
    date: string;      // YYYY-MM-DD
    startHour: number;  // 0–23
    duration: number;   // in hours (can be fractional)
    status: "confirmed" | "pending" | "completed" | "cancelled" | "no_show";
    assignedTo: string;
    avatar?: string;
    amount?: string;
}

export const EVENT_TYPE_CONFIG: Record<
    CalendarEventType,
    { label: string; bgClass: string; textClass: string; dotClass: string; borderClass: string }
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

function getTodayKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function getRelativeDateKey(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Generates a realistic set of mock events around the current date */
export function generateMockEvents(): CalendarEvent[] {
    const today = getTodayKey();

    return [
        // Today
        {
            id: "evt-1",
            title: "Discovery Call",
            leadName: "Sarah Johnson",
            type: "call",
            date: today,
            startHour: 9,
            duration: 1,
            status: "confirmed",
            assignedTo: "Alex M.",
            amount: "$2,500",
        },
        {
            id: "evt-2",
            title: "Follow-Up with Marcus",
            leadName: "Marcus Lee",
            type: "follow_up",
            date: today,
            startHour: 11,
            duration: 0.5,
            status: "pending",
            assignedTo: "You",
        },
        {
            id: "evt-3",
            title: "Demo Presentation",
            leadName: "TechCorp Inc.",
            type: "demo",
            date: today,
            startHour: 14,
            duration: 1,
            status: "confirmed",
            assignedTo: "Jamie K.",
            amount: "$8,000",
        },
        // Overlapping with Sarah Johnson at 9 AM
        {
            id: "evt-17",
            title: "Closing Call",
            leadName: "Nina Patel",
            type: "closing",
            date: today,
            startHour: 9,
            duration: 1,
            status: "confirmed",
            assignedTo: "Jamie K.",
            amount: "$4,200",
        },
        {
            id: "evt-18",
            title: "Follow-Up",
            leadName: "Derek Miles",
            type: "follow_up",
            date: today,
            startHour: 9.5,
            duration: 0.5,
            status: "pending",
            assignedTo: "You",
        },
        // Tomorrow
        {
            id: "evt-4",
            title: "Closing Call",
            leadName: "Rachel Kim",
            type: "closing",
            date: getRelativeDateKey(1),
            startHour: 10,
            duration: 0.75,
            status: "confirmed",
            assignedTo: "You",
            amount: "$5,200",
        },
        {
            id: "evt-5",
            title: "Onboarding Session",
            leadName: "David Park",
            type: "onboarding",
            date: getRelativeDateKey(1),
            startHour: 15,
            duration: 1,
            status: "confirmed",
            assignedTo: "Alex M.",
        },
        // Day after tomorrow
        {
            id: "evt-6",
            title: "Discovery Call",
            leadName: "Emma Watson",
            type: "call",
            date: getRelativeDateKey(2),
            startHour: 9,
            duration: 1,
            status: "pending",
            assignedTo: "Jamie K.",
            amount: "$3,000",
        },
        // 3 days from now
        {
            id: "evt-7",
            title: "Follow-Up",
            leadName: "Chris Torres",
            type: "follow_up",
            date: getRelativeDateKey(3),
            startHour: 13,
            duration: 0.5,
            status: "pending",
            assignedTo: "You",
        },
        {
            id: "evt-8",
            title: "Demo",
            leadName: "NovaTech LLC",
            type: "demo",
            date: getRelativeDateKey(3),
            startHour: 16,
            duration: 1,
            status: "confirmed",
            assignedTo: "Alex M.",
            amount: "$12,000",
        },
        // 5 days from now
        {
            id: "evt-9",
            title: "Closing Call",
            leadName: "Mia Chen",
            type: "closing",
            date: getRelativeDateKey(5),
            startHour: 11,
            duration: 0.75,
            status: "confirmed",
            assignedTo: "You",
            amount: "$7,500",
        },
        // Yesterday
        {
            id: "evt-10",
            title: "Discovery Call",
            leadName: "Jason Brooks",
            type: "call",
            date: getRelativeDateKey(-1),
            startHour: 10,
            duration: 1,
            status: "completed",
            assignedTo: "Jamie K.",
            amount: "$4,000",
        },
        {
            id: "evt-11",
            title: "Follow-Up",
            leadName: "Lisa Wang",
            type: "follow_up",
            date: getRelativeDateKey(-1),
            startHour: 14,
            duration: 0.5,
            status: "completed",
            assignedTo: "You",
        },
        // 2 days ago
        {
            id: "evt-12",
            title: "Closing Call",
            leadName: "Ryan Foster",
            type: "closing",
            date: getRelativeDateKey(-2),
            startHour: 15,
            duration: 0.75,
            status: "no_show",
            assignedTo: "Alex M.",
            amount: "$6,300",
        },
        // 4 days ago
        {
            id: "evt-13",
            title: "Demo",
            leadName: "Apex Solutions",
            type: "demo",
            date: getRelativeDateKey(-4),
            startHour: 11,
            duration: 1,
            status: "completed",
            assignedTo: "Jamie K.",
            amount: "$15,000",
        },
        // 7 days from now
        {
            id: "evt-14",
            title: "Onboarding Session",
            leadName: "Stellar Group",
            type: "onboarding",
            date: getRelativeDateKey(7),
            startHour: 10,
            duration: 1.5,
            status: "confirmed",
            assignedTo: "Alex M.",
        },
        // 10 days from now
        {
            id: "evt-15",
            title: "Discovery Call",
            leadName: "Quantum Startups",
            type: "call",
            date: getRelativeDateKey(10),
            startHour: 14,
            duration: 1,
            status: "pending",
            assignedTo: "You",
            amount: "$9,000",
        },
        // -6 days
        {
            id: "evt-16",
            title: "Follow-Up",
            leadName: "Tyler Adams",
            type: "follow_up",
            date: getRelativeDateKey(-6),
            startHour: 9,
            duration: 0.5,
            status: "cancelled",
            assignedTo: "Jamie K.",
        },
    ];
}
