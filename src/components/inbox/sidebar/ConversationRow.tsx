import { StatusIcon } from "@/components/icons/StatusIcon";
import LeadAvatar from "@/components/inbox/LeadAvatar";
import {
  describeFollowUpTask,
  type FollowUpTask,
  formatFollowUpLabel,
  getFollowUpTask,
} from "@/lib/inbox/followUp";
import { getMessagingWindowState } from "@/lib/inbox/messagingWindow";
import { buildStatusPillStyle } from "@/lib/status/config";
import type { User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import ConversationRowActions, {
  type ConversationAction,
} from "./ConversationRowActions";
import { VerifiedIcon } from "./icons";

interface ConversationRowProps {
  user: User;
  isSelected: boolean;
  // Rows near the top load their avatar eagerly; the rest wait until needed.
  eagerAvatar: boolean;
  statusLookup: Record<string, TagRow>;
  // The time follow-ups are measured against.
  now: number;
  onSelect: () => void;
  onAction: (action: ConversationAction) => void;
}

function formatUnreadBadge(unreadCount: number): string {
  if (unreadCount <= 0) return "!";
  return unreadCount > 9 ? "9+" : String(unreadCount);
}

// A reply that is owed reads warmer the longer it is left; a check-in stays
// quiet until it has been several days.
function getFollowUpChipClass(task: FollowUpTask): string {
  if (task.kind === "awaiting_reply") {
    return task.overdue
      ? "bg-amber-50 text-amber-700"
      : "bg-[#F3F0FF] text-[#8771FF]";
  }
  return task.overdue
    ? "bg-sky-50 text-sky-700"
    : "bg-[#F4F5F8] text-[#606266]";
}

export default function ConversationRow({
  user,
  isSelected,
  eagerAvatar,
  statusLookup,
  now,
  onSelect,
  onAction,
}: ConversationRowProps) {
  const unreadCount = user.unread ?? 0;
  const isUnread = unreadCount > 0;
  const showReplyBadge = isUnread || Boolean(user.needsReply);
  const statusMeta = statusLookup[user.status];
  const statusStyle = statusMeta
    ? buildStatusPillStyle(statusMeta.colorHex)
    : undefined;
  const windowState = getMessagingWindowState(user.lastInboundAt);
  const followUp = getFollowUpTask(user, statusLookup, now);

  return (
    <li
      className={`group relative rounded-2xl transition-colors duration-150 ${
        isSelected ? "bg-[#F3F0FF]" : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className="flex w-full min-w-0 items-center gap-3 rounded-2xl p-3 text-left outline-none"
      >
        <div className="relative shrink-0">
          <LeadAvatar
            conversationId={user.id}
            src={user.avatar}
            alt={user.name}
            className="h-11 w-11 rounded-full object-cover"
            loadingMode={eagerAvatar ? "eager" : "lazy"}
          />
          {showReplyBadge && (
            <span
              className={`absolute -bottom-1 -right-1 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 bg-[#8771FF] px-1 text-[10px] font-semibold leading-none text-white tabular-nums ${
                isSelected ? "border-[#F3F0FF]" : "border-white"
              }`}
            >
              {formatUnreadBadge(unreadCount)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span
              className={`truncate text-[0.9375rem] text-[#101011] ${
                isUnread ? "font-bold" : "font-semibold"
              }`}
            >
              {user.name?.replace("@", "")}
            </span>
            {user.verified && (
              <VerifiedIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            )}
            {windowState && windowState.status !== "ok" && (
              <span
                className={`ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  windowState.status === "closed"
                    ? "bg-red-500"
                    : "bg-amber-500"
                }`}
                title={
                  windowState.status === "closed"
                    ? "Messaging window closed"
                    : "Messaging window closes soon"
                }
              />
            )}
          </div>
          <p
            className={`mt-0.5 truncate text-[0.8125rem] ${
              isUnread ? "font-medium text-[#101011]" : "text-[#606266]"
            }`}
          >
            {user.lastMessage}
          </p>
          {(followUp || user.accountLabel) && (
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
              {followUp && (
                <span
                  className={`inline-flex h-[1.125rem] shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold leading-none tabular-nums ${getFollowUpChipClass(followUp)}`}
                  title={describeFollowUpTask(followUp)}
                >
                  {formatFollowUpLabel(followUp)}
                </span>
              )}
              {user.accountLabel && (
                <span className="truncate text-[11px] text-[#9A9CA2]">
                  {user.accountLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="whitespace-nowrap text-[11px] text-[#9A9CA2] tabular-nums">
            {user.time}
          </span>
          <span
            className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-bold leading-none ${statusMeta ? "" : user.statusColor}`}
            style={statusStyle}
          >
            <StatusIcon
              status={user.status}
              iconPack={statusMeta?.iconPack}
              iconName={statusMeta?.iconName}
              className="h-3.5 w-3.5 shrink-0"
            />
            {user.status}
          </span>
        </div>
      </button>

      <ConversationRowActions
        isPriority={Boolean(user.isPriority)}
        onAction={onAction}
      />
    </li>
  );
}
