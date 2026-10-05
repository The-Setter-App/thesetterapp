import {
  formatRate,
  formatReplyTime,
  formatWholeCurrency,
} from "@/lib/dashboard/format";
import type { DashboardTeamMemberSnapshot } from "@/types/dashboard";

export interface TeamLeaderboardColumn {
  key: string;
  label: string;
  // What the figure measures, shown as a tooltip on the heading.
  hint: string;
  format: (member: DashboardTeamMemberSnapshot) => string;
}

// The figures shown for each person, in reading order. Shared by the table
// and the phone cards so both always show the same things.
export const TEAM_LEADERBOARD_COLUMNS: TeamLeaderboardColumn[] = [
  {
    key: "leads",
    label: "Leads",
    hint: "Leads assigned to them",
    format: (member) => member.leads.toLocaleString(),
  },
  {
    key: "replyTime",
    label: "Reply time",
    hint: "Average time between a lead's message and the reply",
    format: (member) => formatReplyTime(member.avgReplyTimeMs),
  },
  {
    key: "replyRate",
    label: "Reply rate",
    hint: "Share of their leads that got an answer",
    format: (member) => formatRate(member.replyRate),
  },
  {
    key: "qualified",
    label: "Qualified",
    hint: "Leads that reached Qualified or further",
    format: (member) => member.qualified.toLocaleString(),
  },
  {
    key: "booked",
    label: "Booked",
    hint: "Leads that reached Booked or further",
    format: (member) => member.booked.toLocaleString(),
  },
  {
    key: "won",
    label: "Won",
    hint: "Leads that were won",
    format: (member) => member.won.toLocaleString(),
  },
  {
    key: "revenue",
    label: "Revenue",
    hint: "Cash collected from their leads",
    format: (member) => formatWholeCurrency(member.revenue),
  },
];

export function getTeamMemberKey(member: DashboardTeamMemberSnapshot): string {
  return member.email ?? "unassigned";
}
