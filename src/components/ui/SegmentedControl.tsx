interface SegmentedControlOption<Value extends string> {
  value: Value;
  label: string;
  // Shown after the label in a quieter colour, e.g. an unread count.
  count?: number;
}

interface SegmentedControlProps<Value extends string> {
  options: SegmentedControlOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  ariaLabel: string;
}

// A row of mutually exclusive choices on one track, with the active one
// raised as a white pill. Labels are never cut off: when the track is too
// narrow for them it scrolls sideways instead.
export default function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<Value>) {
  return (
    <fieldset
      aria-label={ariaLabel}
      className="flex min-w-0 gap-0.5 overflow-x-auto rounded-full bg-[#F4F5F8] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`inline-flex h-8 shrink-0 flex-auto items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-semibold outline-none transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] ${
              isActive
                ? "bg-white text-[#101011] shadow-[0_1px_3px_rgba(16,16,17,0.12)]"
                : "text-[#606266] [@media(hover:hover)]:hover:text-[#101011]"
            }`}
          >
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`tabular-nums ${isActive ? "text-[#8771FF]" : "text-[#9A9CA2]"}`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
