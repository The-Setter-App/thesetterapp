import { Check, Minus } from "lucide-react";
import { useEffect, useRef } from "react";

interface CustomCheckboxProps {
  checked: boolean | "indeterminate";
  onChange: () => void;
  // Read by screen readers, since the box has no visible text of its own.
  label: string;
}

export default function CustomCheckbox({
  checked,
  onChange,
  label,
}: CustomCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  const isOn = checked === true || checked === "indeterminate";

  return (
    // The label is larger than the box so it is an easy target to hit.
    <label className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked === true}
        onChange={onChange}
        aria-label={label}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-md border transition-colors duration-100 ${
          isOn
            ? "border-[#8771FF] bg-[#8771FF] text-white"
            : "border-[#D8DBE2] bg-white"
        }`}
      >
        {checked === "indeterminate" && <Minus size={12} strokeWidth={3} />}
        {checked === true && <Check size={12} strokeWidth={3} />}
      </span>
    </label>
  );
}
