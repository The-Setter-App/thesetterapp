import {
  CalendarDays,
  Instagram,
  Link2,
  Link2Off,
  MessageSquare,
  Users2,
} from "lucide-react";
import { redirect } from "next/navigation";
import IntegrationFeatureCard from "@/components/settings/IntegrationFeatureCard";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import { requireCurrentSettingsUser } from "@/lib/currentSettingsUser";
import {
  getCachedConnectedInstagramAccounts,
  getCachedTeamMembersForOwner,
} from "@/lib/settingsCache";

export const dynamic = "force-dynamic";

export default async function SettingsIntegrationPage() {
  const { session, user } = await requireCurrentSettingsUser();
  if (user.role !== "owner") {
    redirect(user.role === "viewer" ? "/settings/profile" : "/settings/team");
  }

  const accounts = await getCachedConnectedInstagramAccounts(session.email);
  const teamMembers = await getCachedTeamMembersForOwner(session.email);
  const isConnected = accounts.length > 0;
  const hasTeamMembers = teamMembers.length > 0;

  return (
    <SettingsSectionCard
      title="Workflow integrations"
      description="Connect the channels and workspace tools that power your lead conversations and pipeline."
    >
      <div className="space-y-4 border-b border-[#F0F2F6] px-6 py-6 md:px-8">
        <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
          <div className="mb-2 flex items-center gap-2">
            {isConnected ? (
              <Link2 size={16} className="text-[#8771FF]" />
            ) : (
              <Link2Off size={16} className="text-[#606266]" />
            )}
            <p className="text-sm font-semibold text-[#101011]">
              Integration readiness
            </p>
          </div>
          <p className="text-base font-bold text-[#101011]">
            {isConnected
              ? `${accounts.length} Instagram account${
                  accounts.length > 1 ? "s" : ""
                } connected`
              : "No social channels connected yet"}
          </p>
          <p className="mt-1 text-sm text-[#606266]">
            This page is focused on workflow setup: connecting channels, routing
            conversations, and preparing team execution.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <IntegrationFeatureCard
            title="Instagram inbox flow"
            description="Bring Instagram DMs into Inbox so your team can respond and qualify leads."
            status={isConnected ? "Connected" : "Needs setup"}
            icon={Instagram}
            actions={[
              {
                href: "/settings/socials",
                label: isConnected ? "Manage accounts" : "Connect Instagram",
              },
              { href: "/inbox", label: "Open inbox", variant: "secondary" },
            ]}
          />

          <IntegrationFeatureCard
            title="Pipeline and calendar"
            description="Track outcomes in Leads and schedule booked calls in Calendar."
            status="Ready to use"
            icon={CalendarDays}
            actions={[
              { href: "/leads", label: "Manage pipeline" },
              {
                href: "/calendar",
                label: "Open calendar",
                variant: "secondary",
              },
            ]}
          />

          <IntegrationFeatureCard
            title="Team execution"
            description="Assign setters and closers so conversations are handled without bottlenecks."
            status={hasTeamMembers ? "Team assigned" : "No team members"}
            icon={Users2}
            actions={[
              { href: "/settings/team", label: "Manage team" },
              {
                href: "/setter-ai",
                label: "Open Setter AI",
                variant: "secondary",
              },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-2 md:px-8">
        <div className="rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-[#8771FF]">
            <MessageSquare size={14} />
            <span className="text-xs font-semibold uppercase">
              Why Integration Exists
            </span>
          </div>
          <p className="text-sm text-[#101011]">
            Integrations are meant to connect real sales workflow steps, not
            infrastructure diagnostics.
          </p>
        </div>

        <div className="rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-4 py-3">
          <div className="mb-1 flex items-center gap-2 text-[#8771FF]">
            <Link2 size={14} />
            <span className="text-xs font-semibold uppercase">
              Current focus
            </span>
          </div>
          <p className="text-sm text-[#101011]">
            Connect social channels, keep pipeline outcomes updated, and assign
            clear ownership across your team.
          </p>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
