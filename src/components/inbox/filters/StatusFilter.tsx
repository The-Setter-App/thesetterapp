import { useMemo, useState } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { buildStatusPillStyle, toStatusColorRgba } from "@/lib/status/config";
import type { StatusType } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import FilterCheckbox from "./FilterCheckbox";

interface StatusFilterProps {
  statuses: TagRow[];
  selected: StatusType[];
  onChange: (status: StatusType) => void;
}

export default function StatusFilter({
  statuses,
  selected,
  onChange,
}: StatusFilterProps) {
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
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#101011]">
        Funnel stage
      </h3>

      {selectedStatuses.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {selectedStatuses.map((status) => (
            <button
              key={`selected-${status.id}`}
              type="button"
              onClick={() => onChange(status.name)}
              aria-label={`Remove ${status.name}`}
              className="inline-flex h-7 items-center gap-1 rounded-full border pl-2 pr-1.5 text-xs font-semibold outline-none transition-transform duration-100 ease-out active:scale-[0.97]"
              style={buildStatusPillStyle(status.colorHex, {
                backgroundAlpha: 0.12,
              })}
            >
              <StatusIcon
                iconPack={status.iconPack}
                iconName={status.iconName}
                className="h-3.5 w-3.5"
              />
              {status.name}
              <LuX aria-hidden="true" className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <label className="relative block">
        <span className="sr-only">Search statuses</span>
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9CA2]"
        />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search statuses"
          className="h-11 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-10 pr-4 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:ring-0"
        />
      </label>

      <div className="mt-2 max-h-52 space-y-0.5 overflow-y-auto rounded-2xl border border-[#F0F2F6] p-1.5">
        {filteredStatuses.length === 0 ? (
          <p className="px-2 py-4 text-center text-[0.8125rem] text-[#9A9CA2]">
            No status matches found.
          </p>
        ) : (
          filteredStatuses.map((status) => {
            const isActive = selected.includes(status.name);
            return (
              <button
                key={status.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChange(status.name)}
                className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left outline-none transition-colors duration-100 ${
                  isActive
                    ? "bg-[#F3F0FF]"
                    : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"
                }`}
              >
                <FilterCheckbox checked={isActive} />
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: toStatusColorRgba(status.colorHex, 0.16),
                  }}
                >
                  <StatusIcon
                    iconPack={status.iconPack}
                    iconName={status.iconName}
                    className="h-3.5 w-3.5"
                    style={{ color: status.colorHex }}
                  />
                </span>
                <span className="truncate text-sm font-medium text-[#101011]">
                  {status.name}
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
