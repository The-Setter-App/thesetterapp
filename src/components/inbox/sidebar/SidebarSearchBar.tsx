import { FilterIcon, SearchIcon } from "./icons";

interface SidebarSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatusesCount: number;
  onOpenFilters: () => void;
}

export default function SidebarSearchBar({
  search,
  onSearchChange,
  selectedStatusesCount,
  onOpenFilters,
}: SidebarSearchBarProps) {
  return (
    <div className="p-4 pb-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-[#9A9CA2]" />
          </span>
          <input
            className="h-11 w-full rounded-xl border border-[#F0F2F6] bg-white pl-9 pr-3 text-sm font-medium text-[#101011] placeholder:text-[#9A9CA2] outline-none transition-colors hover:bg-[#F8F7FF] focus:outline-none focus:ring-0"
            placeholder="Search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={onOpenFilters}
          className="px-3 py-2 bg-white border border-[#F0F2F6] rounded-lg text-sm font-semibold text-[#606266] shadow-sm hover:bg-[#F8F7FF] flex items-center"
        >
          <FilterIcon className="w-4 h-4 mr-1.5" />
          Filter
          {selectedStatusesCount > 0 && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#8771FF] text-[10px] text-white">
              {selectedStatusesCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

