import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { isLeadCooling } from "@/lib/inbox/leadCooling";
import type { User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

export type SidebarTab = "all" | "priority" | "unread" | "cooling";

const SIDEBAR_TABS: { value: SidebarTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "priority", label: "Priority" },
  { value: "unread", label: "Unread" },
  { value: "cooling", label: "Cooling" },
];

interface SidebarTabsProps {
  activeTab: SidebarTab;
  users: User[];
  statusLookup: Record<string, TagRow>;
  onTabChange: (tab: SidebarTab) => void;
}

function getTabCount(
  tab: SidebarTab,
  users: User[],
  statusLookup: Record<string, TagRow>,
): number {
  if (tab === "all") return users.length;
  if (tab === "priority") return users.filter((u) => u.isPriority).length;
  if (tab === "cooling") {
    return users.filter((u) => isLeadCooling(u, statusLookup)).length;
  }
  return users.filter((u) => (u.unread ?? 0) > 0).length;
}

export default function SidebarTabs({
  activeTab,
  users,
  statusLookup,
  onTabChange,
}: SidebarTabsProps) {
  return (
    <div className={`${PAGE_GUTTER_CLASS} pb-3`}>
      <SegmentedControl
        ariaLabel="Conversation filter"
        value={activeTab}
        onChange={onTabChange}
        options={SIDEBAR_TABS.map((tab) => ({
          ...tab,
          count: getTabCount(tab.value, users, statusLookup),
        }))}
      />
    </div>
  );
}
