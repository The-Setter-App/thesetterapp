import { Crown, Lock, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import surface from "@/components/ui/brandSurface.module.css";

interface DashboardViewerStateProps {
  displayName: string;
  avatarSrc: string;
}

interface UpgradeBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const UPGRADE_BENEFITS: UpgradeBenefit[] = [
  {
    icon: Crown,
    title: "Owner Access",
    description: "Connect socials and manage team roles.",
  },
  {
    icon: Lock,
    title: "Inbox & Chat",
    description: "Message leads and update pipeline details.",
  },
  {
    icon: Crown,
    title: "Team Collaboration",
    description: "Invite Setters and Closers from Settings.",
  },
];

// Shown instead of the dashboard to accounts with Viewer access.
export default function DashboardViewerState({
  displayName,
  avatarSrc,
}: DashboardViewerStateProps) {
  return (
    <div
      className={`${surface.surface} ${surface.glow} h-full overflow-y-auto px-4 py-8 md:px-6 lg:px-8`}
    >
      <div className="mx-auto flex min-h-full w-full max-w-4xl items-center justify-center">
        <div className={`${surface.materialize} w-full space-y-4`}>
          <div className="flex items-center gap-4 rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-6">
            <Avatar
              src={avatarSrc}
              alt={`${displayName} avatar`}
              size="lg"
              className="shrink-0 border border-[#F0F2F6]"
            />
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-[-0.015em] text-[#101011]">
                Hello, {displayName}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#606266]">
                You currently have Viewer access. Upgrade to unlock messaging,
                team tools, and advanced workspace controls.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#F0F2F6] bg-white p-6 shadow-sm md:p-10">
            <p className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F3F0FF] px-3 text-xs font-semibold text-[#8771FF]">
              <Lock size={13} aria-hidden="true" /> Viewer access
            </p>

            <h1 className="mt-5 text-balance text-[1.75rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011] md:text-[2.25rem]">
              Please buy a subscription
            </h1>
            <p className="mt-3 max-w-2xl text-[1.0625rem] leading-[1.45] text-[#606266]">
              Your account is currently in Viewer mode. Upgrade to an Owner
              subscription to unlock inbox chat, team management, socials, and
              advanced workspace controls.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              {UPGRADE_BENEFITS.map((benefit) => (
                <div
                  key={benefit.title}
                  className="rounded-2xl bg-[#F8F7FF] p-4"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#8771FF]">
                    <benefit.icon size={16} aria-hidden="true" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-[#101011]">
                    {benefit.title}
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
