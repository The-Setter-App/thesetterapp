import type { Dispatch, SetStateAction } from "react";
import ModalShell from "@/components/ui/ModalShell";
import type { StatusType } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import CheckboxOptionList from "./filters/CheckboxOptionList";
import StatusFilter from "./filters/StatusFilter";

interface FilterModalProps {
  show: boolean;
  onClose: () => void;
  selectedStatuses: StatusType[];
  setSelectedStatuses: Dispatch<SetStateAction<StatusType[]>>;
  statusOptions: TagRow[];
  accountOptions: Array<{ id: string; label: string }>;
  selectedAccountIds: string[];
  setSelectedAccountIds: Dispatch<SetStateAction<string[]>>;
  assigneeOptions: Array<{ email: string; label: string }>;
  selectedAssigneeEmails: string[];
  setSelectedAssigneeEmails: Dispatch<SetStateAction<string[]>>;
}

// Adds the value when it is missing and removes it when it is present.
function toggleValue<Value>(values: Value[], value: Value): Value[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export default function FilterModal({
  show,
  onClose,
  selectedStatuses,
  setSelectedStatuses,
  statusOptions,
  accountOptions,
  selectedAccountIds,
  setSelectedAccountIds,
  assigneeOptions,
  selectedAssigneeEmails,
  setSelectedAssigneeEmails,
}: FilterModalProps) {
  if (!show) return null;

  const clearAll = () => {
    setSelectedStatuses([]);
    setSelectedAccountIds([]);
    setSelectedAssigneeEmails([]);
    onClose();
  };

  return (
    <ModalShell
      title="Filters"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-11 items-center rounded-full px-4 text-sm font-semibold text-[#8771FF] outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#F3F0FF]"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white outline-none transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
          >
            Show results
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <StatusFilter
          statuses={statusOptions}
          selected={selectedStatuses}
          onChange={(status) =>
            setSelectedStatuses((prev) => toggleValue(prev, status))
          }
        />
        <CheckboxOptionList
          title="Assigned to"
          options={assigneeOptions.map((assignee) => ({
            id: assignee.email,
            label: assignee.label,
          }))}
          selectedIds={selectedAssigneeEmails}
          emptyLabel="No conversations assigned yet"
          onToggle={(email) =>
            setSelectedAssigneeEmails((prev) => toggleValue(prev, email))
          }
        />
        <CheckboxOptionList
          title="Accounts"
          options={accountOptions}
          selectedIds={selectedAccountIds}
          emptyLabel="No connected accounts"
          onToggle={(id) =>
            setSelectedAccountIds((prev) => toggleValue(prev, id))
          }
        />
      </div>
    </ModalShell>
  );
}
