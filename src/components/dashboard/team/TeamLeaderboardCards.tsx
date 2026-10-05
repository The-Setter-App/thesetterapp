import type { DashboardTeamMemberSnapshot } from "@/types/dashboard";
import TeamMemberIdentity from "./TeamMemberIdentity";
import {
  getTeamMemberKey,
  TEAM_LEADERBOARD_COLUMNS,
} from "./teamLeaderboardColumns";

interface TeamLeaderboardCardsProps {
  members: DashboardTeamMemberSnapshot[];
  getRank: (
    member: DashboardTeamMemberSnapshot,
    index: number,
  ) => number | null;
}

// The leaderboard as one block per person, for screens too narrow for the
// table.
export default function TeamLeaderboardCards({
  members,
  getRank,
}: TeamLeaderboardCardsProps) {
  return (
    <ul className="divide-y divide-[#F0F2F6]">
      {members.map((member, index) => (
        <li
          key={getTeamMemberKey(member)}
          className="py-4 first:pt-0 last:pb-0"
        >
          <TeamMemberIdentity member={member} rank={getRank(member, index)} />
          <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-3 pl-9 sm:grid-cols-4">
            {TEAM_LEADERBOARD_COLUMNS.map((column) => (
              <div key={column.key} className="min-w-0">
                <dt className="truncate text-xs text-[#9A9CA2]">
                  {column.label}
                </dt>
                <dd className="mt-0.5 truncate text-[0.9375rem] font-semibold tabular-nums text-[#101011]">
                  {column.format(member)}
                </dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}
