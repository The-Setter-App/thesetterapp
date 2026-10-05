import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { getFollowUpTask } from "@/lib/inbox/followUp";
import type { User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

export type SidebarTab = "all" | "todo" | "priority" | "unread";

const SIDEBAR_TABS: { value: SidebarTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "priority", label: "Priority" },
  { value: "unread", label: "Unread" },
];

interface SidebarTabsProps {
  activeTab: SidebarTab;
  users: User[];
  statusLookup: Record<string, TagRow>;
  // The time follow-ups are measured against.
  now: number;
  onTabChange: (tab: SidebarTab) => void;
}

function getTabCount(
  tab: SidebarTab,
  users: User[],
  statusLookup: Record<string, TagRow>,
  now: number,
): number {
  if (tab === "all") return users.length;
  if (tab === "priority") return users.filter((u) => u.isPriority).length;
  if (tab === "todo") {
    return users.filter((u) => getFollowUpTask(u, statusLookup, now)).length;
  }
  return users.filter((u) => (u.unread ?? 0) > 0).length;
}

export default function SidebarTabs({
  activeTab,
  users,
  statusLookup,
  now,
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
          count: getTabCount(tab.value, users, statusLookup, now),
        }))}
      />
    </div>
  );
}
