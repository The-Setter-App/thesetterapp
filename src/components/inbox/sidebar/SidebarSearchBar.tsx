import { LuSearch, LuSlidersHorizontal } from "react-icons/lu";

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
  const hasFilters = selectedStatusesCount > 0;

  return (
    <div className="flex gap-2 px-4 pb-3 pt-4">
      <label className="relative flex-1">
        <span className="sr-only">Search conversations</span>
        <LuSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A9CA2]"
        />
        <input
          type="search"
          className="h-11 w-full rounded-full border border-transparent bg-[#F4F5F8] pl-10 pr-4 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:bg-white focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none"
          placeholder="Search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>

      <button
        type="button"
        onClick={onOpenFilters}
        aria-label={
          hasFilters ? `Filters, ${selectedStatusesCount} active` : "Filters"
        }
        className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] ${
          hasFilters
            ? "bg-[#F3F0FF] text-[#8771FF]"
            : "bg-[#F4F5F8] text-[#606266] [@media(hover:hover)]:hover:text-[#101011]"
        }`}
      >
        <LuSlidersHorizontal aria-hidden="true" className="h-4 w-4" />
        {hasFilters && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-white bg-[#8771FF] px-1 text-[10px] font-semibold leading-none text-white tabular-nums"
          >
            {selectedStatusesCount}
          </span>
        )}
      </button>
    </div>
  );
}
