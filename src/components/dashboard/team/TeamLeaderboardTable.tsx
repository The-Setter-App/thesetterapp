import type { DashboardTeamMemberSnapshot } from "@/types/dashboard";
import TeamMemberIdentity from "./TeamMemberIdentity";
import {
  getTeamMemberKey,
  TEAM_LEADERBOARD_COLUMNS,
} from "./teamLeaderboardColumns";

interface TeamLeaderboardTableProps {
  members: DashboardTeamMemberSnapshot[];
  getRank: (
    member: DashboardTeamMemberSnapshot,
    index: number,
  ) => number | null;
}

const HEAD_CELL_CLASS =
  "whitespace-nowrap pb-3 pl-4 text-right text-xs font-medium text-[#9A9CA2]";
const BODY_CELL_CLASS =
  "whitespace-nowrap py-3.5 pl-4 text-right text-[0.9375rem] tabular-nums text-[#101011]";

// The leaderboard as a table, for screens wide enough to hold every figure
// on one line.
export default function TeamLeaderboardTable({
  members,
  getRank,
}: TeamLeaderboardTableProps) {
  return (
    // Fixed layout gives the name column a set share of the width, so long
    // names are cut short instead of pushing the figures off the edge.
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        <col className="w-[30%]" />
      </colgroup>
      <thead>
        <tr>
          <th
            scope="col"
            className="pb-3 text-left text-xs font-medium text-[#9A9CA2]"
          >
            Team member
          </th>
          {TEAM_LEADERBOARD_COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              title={column.hint}
              className={HEAD_CELL_CLASS}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {members.map((member, index) => (
          <tr
            key={getTeamMemberKey(member)}
            className="border-t border-[#F0F2F6]"
          >
            <th scope="row" className="py-3.5 text-left font-normal">
              <TeamMemberIdentity
                member={member}
                rank={getRank(member, index)}
              />
            </th>
            {TEAM_LEADERBOARD_COLUMNS.map((column) => (
              <td
                key={column.key}
                className={`${BODY_CELL_CLASS} ${
                  column.key === "revenue" ? "font-semibold" : ""
                }`}
              >
                {column.format(member)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
