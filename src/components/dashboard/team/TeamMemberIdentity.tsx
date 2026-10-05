import type {
  DashboardTeamMemberSnapshot,
  DashboardTeamRole,
} from "@/types/dashboard";

const ROLE_LABELS: Record<DashboardTeamRole, string> = {
  owner: "Owner",
  setter: "Setter",
  closer: "Closer",
};

interface TeamMemberIdentityProps {
  member: DashboardTeamMemberSnapshot;
  // Position on the leaderboard, or null for the unassigned row.
  rank: number | null;
}

function describeMember(member: DashboardTeamMemberSnapshot): string {
  if (member.email === null) return "Leads nobody owns yet";
  return member.role ? ROLE_LABELS[member.role] : "No longer on the team";
}

// Who a leaderboard row belongs to: their rank, initial, name and role.
export default function TeamMemberIdentity({
  member,
  rank,
}: TeamMemberIdentityProps) {
  const isLeader = rank === 1;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
          isLeader ? "bg-[#8771FF] text-white" : "text-[#9A9CA2]"
        }`}
      >
        {rank ?? ""}
        {rank !== null && <span className="sr-only"> place</span>}
      </span>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-sm font-semibold uppercase text-[#8771FF]"
      >
        {member.email === null ? "–" : member.label.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-medium text-[#101011]">
          {member.label}
        </p>
        <p className="truncate text-xs text-[#9A9CA2]">
          {describeMember(member)}
        </p>
      </div>
    </div>
  );
}
