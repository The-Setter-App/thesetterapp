import type { UserRole } from "@/types/auth";

export interface SettingsTab {
  href: string;
  label: string;
  // One line under the page title while this tab is open.
  description: string;
}

const ACCOUNT_TAB: SettingsTab = {
  href: "/settings/profile",
  label: "Account",
  description: "Your name and picture across the workspace.",
};

const PIPELINE_TAB: SettingsTab = {
  href: "/settings/tags",
  label: "Pipeline",
  description: "The statuses a lead moves through in Inbox and Leads.",
};

const OWNER_TABS: SettingsTab[] = [
  ACCOUNT_TAB,
  {
    href: "/settings/team",
    label: "Team",
    description:
      "Who is in the workspace, how leads are shared out and how you reply.",
  },
  {
    href: "/settings/socials",
    label: "Instagram",
    description:
      "Connected accounts, comment automations and blocked accounts.",
  },
  PIPELINE_TAB,
  {
    href: "/settings/integration",
    label: "Integrations",
    description: "Other tools connected to your workspace.",
  },
];

const TEAM_MEMBER_TABS: SettingsTab[] = [
  ACCOUNT_TAB,
  {
    href: "/settings/team",
    label: "Team",
    description: "Who owns the workspace and who is on the team.",
  },
  {
    href: "/settings/socials",
    label: "Instagram",
    description: "Accounts whose messages are kept out of the inbox.",
  },
  PIPELINE_TAB,
];

const VIEWER_TABS: SettingsTab[] = [ACCOUNT_TAB];

export function getSettingsTabs(role: UserRole): SettingsTab[] {
  if (role === "owner") return OWNER_TABS;
  if (role === "setter" || role === "closer") return TEAM_MEMBER_TABS;
  return VIEWER_TABS;
}

// The tab a path belongs to. `/settings` itself shows the account tab.
export function findActiveSettingsTab(
  tabs: SettingsTab[],
  pathname: string | null,
): SettingsTab {
  return tabs.find((tab) => tab.href === pathname) ?? tabs[0];
}
