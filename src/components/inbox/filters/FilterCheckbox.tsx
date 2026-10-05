import { LuCheck } from "react-icons/lu";

interface FilterCheckboxProps {
  checked: boolean;
}

// The box only; the row that contains it is the button that toggles it.
export default function FilterCheckbox({ checked }: FilterCheckboxProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-100 ${
        checked
          ? "border-[#8771FF] bg-[#8771FF] text-white"
          : "border-[#D8DBE2] bg-white text-transparent"
      }`}
    >
      <LuCheck className="h-3.5 w-3.5" strokeWidth={3} />
    </span>
  );
}
