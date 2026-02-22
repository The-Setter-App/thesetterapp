import type { User } from "@/types/inbox";

export type SidebarTab = "all" | "priority" | "unread";

const SIDEBAR_TABS: SidebarTab[] = ["all", "priority", "unread"];

interface SidebarTabsProps {
  activeTab: SidebarTab;
  users: User[];
  onTabChange: (tab: SidebarTab) => void;
}

function getTabCount(tab: SidebarTab, users: User[]): number {
  if (tab === "all") return users.length;
  if (tab === "priority") return users.filter((u) => u.isPriority).length;
  return users.filter((u) => (u.unread ?? 0) > 0).length;
}

export default function SidebarTabs({
  activeTab,
  users,
  onTabChange,
}: SidebarTabsProps) {
  return (
    <div className="border-t border-b border-gray-200 px-4 py-3">
      <div className="flex gap-2 text-xs font-bold">
        {SIDEBAR_TABS.map((tab) => (
          <button
            type="button"
            key={tab}
            className={`flex-1 py-1.5 rounded-full capitalize transition-colors ${activeTab === tab ? "bg-[#8771FF] text-white" : "text-gray-500 hover:bg-gray-100"}`}
            onClick={() => onTabChange(tab)}
          >
            {tab} [{getTabCount(tab, users)}]
          </button>
        ))}
      </div>
    </div>
  );
}
