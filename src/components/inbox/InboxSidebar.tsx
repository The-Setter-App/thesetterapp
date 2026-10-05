"use client";

import { useParams, useRouter } from "next/navigation";
import { type CSSProperties, useState } from "react";
import ConversationList from "@/components/inbox/ConversationList";
import { useInboxSync } from "@/components/inbox/InboxSyncContext";
import { useNow } from "@/hooks/useNow";
import FilterModal from "./FilterModal";
import {
  SidebarEmptyState,
  SidebarLoadingState,
  SidebarNoConnectedAccountsState,
} from "./sidebar/SidebarContentState";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarSearchBar from "./sidebar/SidebarSearchBar";
import SidebarTabs from "./sidebar/SidebarTabs";
import useInboxSidebarData from "./sidebar/useInboxSidebarData";
import useSidebarFilters from "./sidebar/useSidebarFilters";

const DEFAULT_WIDTH_PX = 380;
// How often the waiting times on conversations are brought up to date.
const FOLLOW_UP_CLOCK_INTERVAL_MS = 60_000;

type SidebarWidthStyle = CSSProperties & { "--inbox-sidebar-width": string };

interface InboxSidebarProps {
  // Width from `md` up; on phones the list always fills the screen.
  width?: number;
  // True while a conversation is open, so the list steps aside on phones.
  hiddenOnMobile?: boolean;
}

export default function InboxSidebar({
  width = DEFAULT_WIDTH_PX,
  hiddenOnMobile = false,
}: InboxSidebarProps) {
  const widthStyle: SidebarWidthStyle = {
    "--inbox-sidebar-width": `${width}px`,
  };
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;
  const { epoch, markSidebarReady } = useInboxSync();

  const [showFilterModal, setShowFilterModal] = useState(false);
  const now = useNow(FOLLOW_UP_CLOCK_INTERVAL_MS);
  const {
    users,
    loading,
    hasConnectedAccounts,
    statusCatalog,
    statusLookup,
    handleConversationAction,
  } = useInboxSidebarData({
    epoch,
    markSidebarReady,
  });
  const {
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
  } = useSidebarFilters(users, statusLookup, now);

  return (
    <aside
      className={`h-full w-full flex-shrink-0 flex-col bg-white md:w-[var(--inbox-sidebar-width)] ${
        hiddenOnMobile ? "hidden md:flex" : "flex"
      }`}
      style={widthStyle}
    >
      <SidebarHeader />

      {hasConnectedAccounts && (
        <SidebarSearchBar
          search={search}
          onSearchChange={setSearch}
          selectedStatusesCount={selectedStatuses.length}
          onOpenFilters={() => setShowFilterModal(true)}
        />
      )}

      {hasConnectedAccounts && (
        <SidebarTabs
          activeTab={activeTab}
          users={users}
          statusLookup={statusLookup}
          now={now}
          onTabChange={setActiveTab}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {!hasConnectedAccounts ? (
          <SidebarNoConnectedAccountsState />
        ) : filteredUsers.length > 0 ? (
          <ConversationList
            users={filteredUsers}
            selectedUserId={selectedUserId}
            onSelectUser={(id) => router.push(`/inbox/${id}`)}
            onAction={handleConversationAction}
            statusLookup={statusLookup}
            now={now}
          />
        ) : loading ? (
          <SidebarLoadingState />
        ) : (
          <SidebarEmptyState
            hasActiveFilters={hasActiveFilters}
            isTodoTab={activeTab === "todo"}
          />
        )}
      </div>

      <FilterModal
        show={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedStatuses={selectedStatuses}
        setSelectedStatuses={setSelectedStatuses}
        statusOptions={statusCatalog}
        accountOptions={accountOptions}
        selectedAccountIds={selectedAccountIds}
        setSelectedAccountIds={setSelectedAccountIds}
        assigneeOptions={assigneeOptions}
        selectedAssigneeEmails={selectedAssigneeEmails}
        setSelectedAssigneeEmails={setSelectedAssigneeEmails}
      />
    </aside>
  );
}
