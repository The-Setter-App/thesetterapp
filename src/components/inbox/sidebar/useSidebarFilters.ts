import { useEffect, useMemo, useState } from "react";
import type { StatusType, User } from "@/types/inbox";
import type { SidebarTab } from "./SidebarTabs";

const INBOX_FILTER_STATUSES_KEY = "inbox_filter_statuses";
const INBOX_FILTER_ACCOUNTS_KEY = "inbox_filter_accounts";

interface UseSidebarFiltersResult {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activeTab: SidebarTab;
  setActiveTab: React.Dispatch<React.SetStateAction<SidebarTab>>;
  selectedStatuses: StatusType[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<StatusType[]>>;
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
  filteredUsers: User[];
  accountOptions: Array<{ id: string; label: string }>;
  hasActiveFilters: boolean;
}

export default function useSidebarFilters(
  users: User[],
): UseSidebarFiltersResult {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(INBOX_FILTER_STATUSES_KEY);
    if (saved) {
      setSelectedStatuses(JSON.parse(saved) as StatusType[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      INBOX_FILTER_STATUSES_KEY,
      JSON.stringify(selectedStatuses),
    );
  }, [selectedStatuses]);

  useEffect(() => {
    const saved = localStorage.getItem(INBOX_FILTER_ACCOUNTS_KEY);
    if (saved) {
      setSelectedAccountIds(JSON.parse(saved) as string[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      INBOX_FILTER_ACCOUNTS_KEY,
      JSON.stringify(selectedAccountIds),
    );
  }, [selectedAccountIds]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesTab =
          activeTab === "all" ||
          (activeTab === "priority" && Boolean(user.isPriority)) ||
          (activeTab === "unread" && (user.unread ?? 0) > 0);
        const matchesStatus =
          selectedStatuses.length === 0 ||
          selectedStatuses.includes(user.status);
        const matchesAccount =
          selectedAccountIds.length === 0 ||
          (user.accountId
            ? selectedAccountIds.includes(user.accountId)
            : false);
        const query = search.toLowerCase();
        const matchesSearch =
          user.name.toLowerCase().includes(query) ||
          user.lastMessage?.toLowerCase().includes(query);

        return matchesTab && matchesStatus && matchesAccount && matchesSearch;
      }),
    [activeTab, search, selectedAccountIds, selectedStatuses, users],
  );

  const accountOptions = useMemo(
    () =>
      Array.from(
        new Map(
          users
            .filter((user): user is User & { accountId: string } =>
              Boolean(user.accountId),
            )
            .map((user) => [
              user.accountId,
              {
                id: user.accountId,
                label:
                  user.accountLabel ||
                  user.ownerInstagramUserId ||
                  user.accountId,
              },
            ]),
        ).values(),
      ),
    [users],
  );

  const hasActiveFilters =
    Boolean(search) ||
    selectedStatuses.length > 0 ||
    selectedAccountIds.length > 0 ||
    activeTab !== "all";

  return {
    search,
    setSearch,
    activeTab,
    setActiveTab,
    selectedStatuses,
    setSelectedStatuses,
    selectedAccountIds,
    setSelectedAccountIds,
    filteredUsers,
    accountOptions,
    hasActiveFilters,
  };
}
