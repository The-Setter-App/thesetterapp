import { Inter } from "next/font/google";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { LuChevronDown, LuUserRound, LuUsers } from "react-icons/lu";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { buildStatusPillStyle, toStatusColorRgba } from "@/lib/status/config";
import type { StatusType } from "@/types/inbox";
import type { TagRow } from "@/types/tags";

const inter = Inter({ subsets: ["latin"] });

function StatusFilter({
  statuses,
  selected,
  onChange,
}: {
  statuses: TagRow[];
  selected: StatusType[];
  onChange: (status: StatusType) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredStatuses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return statuses;
    return statuses.filter((status) =>
      `${status.name} ${status.description}`.toLowerCase().includes(query),
    );
  }, [search, statuses]);

  const selectedStatuses = useMemo(
    () => statuses.filter((status) => selected.includes(status.name)),
    [selected, statuses],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selectedStatuses.length === 0 ? (
          <span className="rounded-full border border-[#F0F2F6] bg-white px-2 py-1 text-[10px] font-medium text-[#9A9CA2]">
            No statuses selected
          </span>
        ) : (
          selectedStatuses.map((status) => (
            <button
              key={`selected-${status.id}`}
              type="button"
              onClick={() => onChange(status.name)}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
              style={buildStatusPillStyle(status.colorHex, { backgroundAlpha: 0.12 })}
            >
              <StatusIcon
                iconPack={status.iconPack}
                iconName={status.iconName}
                className="h-3 w-3"
              />
              {status.name}
              <span className="text-[9px]">x</span>
            </button>
          ))
        )}
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#9A9CA2]">
          <Search className="h-3.5 w-3.5" />
        </span>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search statuses"
          className="h-9 w-full rounded-lg border border-[#F0F2F6] bg-white pl-8 pr-3 text-xs text-[#101011] outline-none transition-colors placeholder:text-[#9A9CA2] hover:bg-[#F8F7FF]"
        />
      </div>

      <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border border-[#F0F2F6] p-1">
        {filteredStatuses.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-[#9A9CA2]">
            No status matches found.
          </p>
        ) : (
          filteredStatuses.map((status) => {
            const isActive = selected.includes(status.name);
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => onChange(status.name)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                  isActive ? "bg-[#F3F0FF]" : "hover:bg-[#F8F8FA]"
                }`}
              >
                <div
                  className={`flex h-[13px] w-[13px] items-center justify-center rounded-[3px] border ${
                    isActive
                      ? "border-[#8771FF] bg-[#8771FF]"
                      : "border-[#F0F2F6] bg-white"
                  }`}
                >
                  {isActive && (
                    <div className="mb-0.5 h-1 w-1.5 -rotate-45 border-b-2 border-l-2 border-white" />
                  )}
                </div>
                <div
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px]"
                  style={{ backgroundColor: toStatusColorRgba(status.colorHex, 0.16) }}
                >
                  <StatusIcon
                    iconPack={status.iconPack}
                    iconName={status.iconName}
                    className="h-3 w-3"
                    style={{ color: status.colorHex }}
                  />
                </div>
                <span
                  className="truncate text-[13px] font-medium"
                  style={{ color: status.colorHex }}
                >
                  {status.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
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
}: {
  show: boolean;
  onClose: () => void;
  selectedStatuses: StatusType[];
  setSelectedStatuses: React.Dispatch<React.SetStateAction<StatusType[]>>;
  statusOptions: TagRow[];
  accountOptions: Array<{ id: string; label: string }>;
  selectedAccountIds: string[];
  setSelectedAccountIds: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  if (!show) return null;
  return (
    <div
      className={`${inter.className} fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 antialiased`}
    >
      <div className="flex w-[440px] flex-col overflow-hidden rounded-[18px] border border-[#F0F2F6] bg-white font-sans shadow-sm">
        <div className="px-4 pb-2 pt-4 text-[15px] font-medium text-[#2B2B2C]">
          Filters
        </div>

        <div className="px-3 pb-2 pt-1">
          <div className="mb-1 px-1 text-[14px] font-medium text-[#2B2B2C]">
            Funnel Stage
          </div>
          <StatusFilter
            statuses={statusOptions}
            selected={selectedStatuses}
            onChange={(status) =>
              setSelectedStatuses((prev) =>
                prev.includes(status)
                  ? prev.filter((s) => s !== status)
                  : [...prev, status],
              )
            }
          />
        </div>

        <div className="space-y-3 p-3">
          <div className="space-y-1">
            <label className="px-1 text-[14px] font-medium text-[#2B2B2C]">
              Assigned to
            </label>
            <div className="flex h-[32px] w-full cursor-pointer items-center justify-between rounded-md border border-[#F0F2F6] bg-white px-2">
              <span className="flex items-center gap-2 text-[12px] text-[#2B2B2C]">
                <LuUsers className="h-4 w-4 text-[#606266]" />
                All team members
              </span>
              <LuChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="px-1 text-[14px] font-medium text-[#2B2B2C]">
              Accounts
            </label>
            <div className="max-h-[140px] space-y-1 overflow-y-auto rounded-md border border-[#F0F2F6] bg-white px-2 py-2">
              {accountOptions.length === 0 && (
                <span className="flex items-center gap-2 px-1 py-1 text-[12px] text-[#9CA3AF]">
                  <LuUserRound className="h-4 w-4" />
                  No connected accounts
                </span>
              )}
              {accountOptions.map((account) => {
                const checked = selectedAccountIds.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      setSelectedAccountIds((prev) =>
                        prev.includes(account.id)
                          ? prev.filter((id) => id !== account.id)
                          : [...prev, account.id],
                      )
                    }
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[12px] text-[#2B2B2C] hover:bg-[#F8F8FA]"
                  >
                    <div
                      className={`flex h-[13px] w-[13px] items-center justify-center rounded-[3px] border ${
                        checked
                          ? "border-[#8771FF] bg-[#8771FF]"
                          : "border-[#F0F2F6] bg-white"
                      }`}
                    >
                      {checked && (
                        <div className="mb-0.5 h-1 w-1.5 -rotate-45 border-b-2 border-l-2 border-white" />
                      )}
                    </div>
                    <span className="truncate">{account.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-[#F0F2F6] p-3">
          <button
            type="button"
            onClick={() => {
              setSelectedStatuses([]);
              setSelectedAccountIds([]);
              onClose();
            }}
            className="rounded-lg px-3 py-1 text-[12px] font-medium text-[#8771FF] transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#8771FF] px-3 py-1 text-[12px] font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Show result
          </button>
        </div>
      </div>
    </div>
  );
}
