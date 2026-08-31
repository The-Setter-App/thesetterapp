import type {
  UseInboxSidebarDataOptions,
  UseInboxSidebarDataResult,
} from "./types";
import useInboxSidebarActions from "./useInboxSidebarActions";
import useInboxSidebarRealtime from "./useInboxSidebarRealtime";
import useInboxSidebarStatusCatalog from "./useInboxSidebarStatusCatalog";
import useInboxSidebarUserMutations from "./useInboxSidebarUserMutations";
import useInboxSidebarUsers from "./useInboxSidebarUsers";

export default function useInboxSidebarData({
  epoch,
  markSidebarReady,
}: UseInboxSidebarDataOptions): UseInboxSidebarDataResult {
  const {
    users,
    setUsers,
    loading,
    hasConnectedAccounts,
    refetchConversations,
  } = useInboxSidebarUsers({
    epoch,
    markSidebarReady,
  });

  const { statusCatalog, statusLookup } = useInboxSidebarStatusCatalog();

  const {
    applyHydratedPreview,
    applyUserStatusUpdate,
    applyUserPriorityUpdate,
    applyOptimisticRealtimePreview,
  } = useInboxSidebarUserMutations({
    setUsers,
  });

  useInboxSidebarRealtime({
    usersLength: users.length,
    refetchConversations,
    applyHydratedPreview,
    applyOptimisticRealtimePreview,
    applyUserPriorityUpdate,
    applyUserStatusUpdate,
  });

  const { handleConversationAction } = useInboxSidebarActions({
    users,
    applyUserStatusUpdate,
    applyUserPriorityUpdate,
  });

  return {
    users,
    loading,
    hasConnectedAccounts,
    statusCatalog,
    statusLookup,
    handleConversationAction,
  };
}
