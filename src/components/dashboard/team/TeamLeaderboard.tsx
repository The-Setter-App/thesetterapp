import surface from "@/components/ui/brandSurface.module.css";
import type { DashboardTeamMemberSnapshot } from "@/types/dashboard";
import { orderStyle } from "../orderStyle";
import TeamLeaderboardCards from "./TeamLeaderboardCards";
import TeamLeaderboardTable from "./TeamLeaderboardTable";

interface TeamLeaderboardProps {
  members: DashboardTeamMemberSnapshot[];
  order: number;
}

// Rows arrive best first. People are numbered from the top; the row for
// leads nobody owns is not a person, so it carries no rank.
function getRank(
  member: DashboardTeamMemberSnapshot,
  index: number,
): number | null {
  return member.email === null ? null : index + 1;
}

// How each person on the team is doing with the leads they own.
export default function TeamLeaderboard({
  members,
  order,
}: TeamLeaderboardProps) {
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="dashboard-team-title"
      style={orderStyle(order)}
      className={`${surface.materialize} rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-7`}
    >
      <h2
        id="dashboard-team-title"
        className="text-xl font-semibold tracking-[-0.015em] text-[#101011]"
      >
        Team
      </h2>
      <p className="mt-1 text-sm text-[#606266]">
        All time. A lead counts for whoever it is assigned to.
      </p>

      <div className="mt-5 hidden xl:block">
        <TeamLeaderboardTable members={members} getRank={getRank} />
      </div>
      <div className="mt-5 xl:hidden">
        <TeamLeaderboardCards members={members} getRank={getRank} />
      </div>
    </section>
  );
}
