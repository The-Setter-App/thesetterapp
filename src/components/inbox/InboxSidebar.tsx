"use client";

import { Inter } from "next/font/google"; // Import Inter
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConversationList from "@/components/inbox/ConversationList";
import { useInboxSync } from "@/components/inbox/InboxSyncContext";
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

const inter = Inter({ subsets: ["latin"] });

interface InboxSidebarProps {
  width?: number;
}

export default function InboxSidebar({ width }: InboxSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const selectedUserId = params?.id as string;
  const { epoch, markSidebarReady } = useInboxSync();

  const [showFilterModal, setShowFilterModal] = useState(false);
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
    filteredUsers,
    accountOptions,
    hasActiveFilters,
  } = useSidebarFilters(users);

  return (
    <aside
      className={`${inter.className} bg-white flex flex-col flex-shrink-0 h-full antialiased`}
      style={width ? { width: `${width}px` } : undefined}
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
          />
        ) : loading ? (
          <SidebarLoadingState />
        ) : (
          <SidebarEmptyState hasActiveFilters={hasActiveFilters} />
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
      />
    </aside>
  );
}
