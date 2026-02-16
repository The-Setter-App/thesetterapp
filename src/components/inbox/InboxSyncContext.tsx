"use client";

import { createContext, useContext } from "react";

export interface InboxSyncContextValue {
  epoch: number;
  selectedConversationId: string | null;
  gateVisible: boolean;
  markSidebarReady: (epoch: number) => void;
  markChatReady: (epoch: number) => void;
}

const InboxSyncContext = createContext<InboxSyncContextValue | null>(null);

export function InboxSyncProvider({
  value,
  children,
}: {
  value: InboxSyncContextValue;
  children: React.ReactNode;
}) {
  return <InboxSyncContext.Provider value={value}>{children}</InboxSyncContext.Provider>;
}

export function useInboxSync(): InboxSyncContextValue {
  const context = useContext(InboxSyncContext);
  if (!context) {
    throw new Error("useInboxSync must be used within InboxSyncProvider");
  }
  return context;
}

