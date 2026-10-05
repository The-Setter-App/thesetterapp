import { LuUserRound } from "react-icons/lu";
import FilterCheckbox from "./FilterCheckbox";

export interface CheckboxOption {
  id: string;
  label: string;
}

interface CheckboxOptionListProps {
  title: string;
  options: CheckboxOption[];
  selectedIds: string[];
  emptyLabel: string;
  onToggle: (id: string) => void;
}

// A titled list of options that can each be switched on or off.
export default function CheckboxOptionList({
  title,
  options,
  selectedIds,
  emptyLabel,
  onToggle,
}: CheckboxOptionListProps) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#101011]">{title}</h3>
      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-2xl border border-[#F0F2F6] p-1.5">
        {options.length === 0 && (
          <p className="flex h-10 items-center gap-2 px-2 text-[0.8125rem] text-[#9A9CA2]">
            <LuUserRound aria-hidden="true" className="h-4 w-4" />
            {emptyLabel}
          </p>
        )}
        {options.map((option) => {
          const checked = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={checked}
              onClick={() => onToggle(option.id)}
              className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm text-[#101011] outline-none transition-colors duration-100 ${
                checked
                  ? "bg-[#F3F0FF]"
                  : "[@media(hover:hover)]:hover:bg-[#F8F7FF]"
              }`}
            >
              <FilterCheckbox checked={checked} />
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
