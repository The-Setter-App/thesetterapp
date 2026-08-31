import type { User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

export type ConversationAction =
  | "qualified"
  | "priority"
  | "unpriority"
  | "delete";

export interface UseInboxSidebarDataOptions {
  epoch: number;
  markSidebarReady: (readyEpoch: number) => void;
}

export interface UseInboxSidebarDataResult {
  users: User[];
  loading: boolean;
  hasConnectedAccounts: boolean;
  statusCatalog: TagRow[];
  statusLookup: Record<string, TagRow>;
  handleConversationAction: (
    userId: string,
    action: ConversationAction,
  ) => Promise<void>;
}
