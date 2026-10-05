import { useEffect, useMemo, useState } from "react";
import {
  compareFollowUpTasks,
  type FollowUpTask,
  getFollowUpTask,
} from "@/lib/inbox/followUp";
import type { StatusType, User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import type { SidebarTab } from "./SidebarTabs";

const INBOX_FILTER_STATUSES_KEY = "inbox_filter_statuses";
const INBOX_FILTER_ACCOUNTS_KEY = "inbox_filter_accounts";
const INBOX_FILTER_ASSIGNEES_KEY = "inbox_filter_assignees";

interface UseSidebarFiltersResult {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activeTab: SidebarTab;
  setActiveTab: React.Dispatch<React.SetStateAction<SidebarTab>>;
  selectedStatuses: StatusType[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<StatusType[]>>;
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedAssigneeEmails: string[];
  setSelectedAssigneeEmails: React.Dispatch<React.SetStateAction<string[]>>;
  filteredUsers: User[];
  accountOptions: Array<{ id: string; label: string }>;
  assigneeOptions: Array<{ email: string; label: string }>;
  hasActiveFilters: boolean;
}

export default function useSidebarFilters(
  users: User[],
  statusLookup: Record<string, TagRow>,
  // The time follow-ups are measured against.
  now: number,
): UseSidebarFiltersResult {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SidebarTab>("all");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedAssigneeEmails, setSelectedAssigneeEmails] = useState<
    string[]
  >([]);

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

  useEffect(() => {
    const saved = localStorage.getItem(INBOX_FILTER_ASSIGNEES_KEY);
    if (saved) {
      setSelectedAssigneeEmails(JSON.parse(saved) as string[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      INBOX_FILTER_ASSIGNEES_KEY,
      JSON.stringify(selectedAssigneeEmails),
    );
  }, [selectedAssigneeEmails]);

  const filteredUsers = useMemo(() => {
    const query = search.toLowerCase();
    const tasksByUserId = new Map<string, FollowUpTask>();

    const matches = users.filter((user) => {
      if (activeTab === "priority" && !user.isPriority) return false;
      if (activeTab === "unread" && (user.unread ?? 0) <= 0) return false;
      if (activeTab === "todo") {
        const task = getFollowUpTask(user, statusLookup, now);
        if (!task) return false;
        tasksByUserId.set(user.id, task);
      }

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(user.status);
      const matchesAccount =
        selectedAccountIds.length === 0 ||
        (user.accountId ? selectedAccountIds.includes(user.accountId) : false);
      const matchesAssignee =
        selectedAssigneeEmails.length === 0 ||
        (user.assignedToEmail
          ? selectedAssigneeEmails.includes(user.assignedToEmail)
          : false);
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.lastMessage?.toLowerCase().includes(query);

      return (
        matchesStatus && matchesAccount && matchesAssignee && matchesSearch
      );
    });

    if (activeTab !== "todo") return matches;

    // The to-do list is worked top to bottom, so it is ordered by what is
    // owed instead of by the latest message.
    return matches.sort((a, b) => {
      const taskA = tasksByUserId.get(a.id);
      const taskB = tasksByUserId.get(b.id);
      return taskA && taskB ? compareFollowUpTasks(taskA, taskB) : 0;
    });
  }, [
    activeTab,
    now,
    search,
    selectedAccountIds,
    selectedAssigneeEmails,
    selectedStatuses,
    statusLookup,
    users,
  ]);

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

  const assigneeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          users
            .filter((user): user is User & { assignedToEmail: string } =>
              Boolean(user.assignedToEmail),
            )
            .map((user) => [
              user.assignedToEmail,
              {
                email: user.assignedToEmail,
                label: user.assignedToLabel || user.assignedToEmail,
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
    selectedAssigneeEmails.length > 0 ||
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
    selectedAssigneeEmails,
    setSelectedAssigneeEmails,
    filteredUsers,
    accountOptions,
    assigneeOptions,
    hasActiveFilters,
  };
}
