"use client";

import type { User } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import ConversationRow from "./sidebar/ConversationRow";
import type { ConversationAction } from "./sidebar/ConversationRowActions";

// Avatars for the rows visible without scrolling load straight away.
const EAGER_AVATAR_COUNT = 8;

interface ConversationListProps {
  users: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onAction: (userId: string, action: ConversationAction) => void;
  statusLookup: Record<string, TagRow>;
}

export default function ConversationList({
  users,
  selectedUserId,
  onSelectUser,
  onAction,
  statusLookup,
}: ConversationListProps) {
  return (
    // Rows have 12px of their own padding, so this inset puts their content
    // on the page gutter (16 / 24 / 32px) while the hover tint extends past it.
    <ul className="space-y-0.5 px-1 pb-3 md:px-3 lg:px-5">
      {users.map((user, index) => (
        <ConversationRow
          key={user.id}
          user={user}
          isSelected={selectedUserId === user.id}
          eagerAvatar={index < EAGER_AVATAR_COUNT}
          statusLookup={statusLookup}
          onSelect={() => onSelectUser(user.id)}
          onAction={(action) => onAction(user.id, action)}
        />
      ))}
    </ul>
  );
}
