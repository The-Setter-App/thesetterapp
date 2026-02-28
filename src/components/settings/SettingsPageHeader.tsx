"use client";

import { usePathname } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import type { UserRole } from "@/types/auth";

const ROUTE_COPY: Record<
  string,
  {
    ownerDescription: string;
    teamDescription?: string;
    viewerDescription?: string;
  }
> = {
  "/settings": {
    ownerDescription: "Manage your account profile and workspace identity.",
    teamDescription: "Manage your account profile details.",
    viewerDescription: "Manage your workspace profile.",
  },
  "/settings/profile": {
    ownerDescription: "Manage your account profile and workspace identity.",
    teamDescription: "Manage your account profile details.",
    viewerDescription: "Manage your workspace profile.",
  },
  "/settings/team": {
    ownerDescription: "Assign Setter and Closer roles for your shared workspace.",
    teamDescription: "Review workspace ownership and assigned team members.",
    viewerDescription: "Team settings require an active subscription.",
  },
  "/settings/socials": {
    ownerDescription: "Connect and manage Instagram business accounts used by Inbox.",
  },
  "/settings/tags": {
    ownerDescription: "Manage preset and custom tags used across Inbox and Leads.",
    teamDescription: "Manage tags used across Inbox and Leads.",
  },
  "/settings/integration": {
    ownerDescription:
      "Connect the channels and workspace tools that power your lead conversations and pipeline.",
  },
};

function getDescriptionByRole(
  role: UserRole,
  routeCopy: (typeof ROUTE_COPY)[string],
): string {
  if (role === "viewer") {
    return routeCopy.viewerDescription ?? routeCopy.ownerDescription;
  }
  if (role === "setter" || role === "closer") {
    return routeCopy.teamDescription ?? routeCopy.ownerDescription;
  }
  return routeCopy.ownerDescription;
}

export default function SettingsPageHeader({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const routeCopy = ROUTE_COPY[pathname] ?? ROUTE_COPY["/settings/profile"];

  return (
    <PageHeader
      title="Settings"
      description={getDescriptionByRole(role, routeCopy)}
    />
  );
}
