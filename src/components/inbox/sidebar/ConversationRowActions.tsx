import type { IconType } from "react-icons";
import { LuFlag, LuFlagOff, LuStar, LuX } from "react-icons/lu";

export type ConversationAction =
  | "qualified"
  | "priority"
  | "unpriority"
  | "delete";

interface ConversationRowActionsProps {
  isPriority: boolean;
  onAction: (action: ConversationAction) => void;
}

interface RowAction {
  action: ConversationAction;
  label: string;
  icon: IconType;
  hoverClassName: string;
}

// Quick actions revealed when a row is hovered. They sit over the row's
// right-hand side, so they are kept out of the tab order like before.
export default function ConversationRowActions({
  isPriority,
  onAction,
}: ConversationRowActionsProps) {
  const actions: RowAction[] = [
    {
      action: "qualified",
      label: "Mark as qualified",
      icon: LuStar,
      hoverClassName: "[@media(hover:hover)]:hover:text-amber-500",
    },
    {
      action: isPriority ? "unpriority" : "priority",
      label: isPriority
        ? "Remove from priority inbox"
        : "Move to priority inbox",
      icon: isPriority ? LuFlagOff : LuFlag,
      hoverClassName: "[@media(hover:hover)]:hover:text-[#8771FF]",
    },
    {
      action: "delete",
      label: "Unqualify and remove user from inbox",
      icon: LuX,
      hoverClassName: "[@media(hover:hover)]:hover:text-red-500",
    },
  ];

  return (
    <div className="pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-[#F0F2F6] bg-white p-1 opacity-0 shadow-[0_6px_20px_rgba(16,16,17,0.1)] transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
      {actions.map(({ action, label, icon: Icon, hoverClassName }) => (
        <button
          key={action}
          type="button"
          tabIndex={-1}
          title={label}
          aria-label={label}
          onClick={(event) => {
            event.stopPropagation();
            onAction(action);
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[#606266] outline-none transition-[transform,color,background-color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:bg-[#F8F7FF] ${hoverClassName}`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
