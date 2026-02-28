import { Check, Minus } from "lucide-react";
import { useEffect, useRef } from "react";

interface CustomCheckboxProps {
  checked: boolean | "indeterminate";
  onChange: () => void;
}

export default function CustomCheckbox({
  checked,
  onChange,
}: CustomCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  return (
    <label className="relative inline-flex h-4 w-4 cursor-pointer">
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked === true}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 flex items-center justify-center rounded-[5px] border transition-all duration-200
        ${
          checked === "indeterminate"
            ? "border-2 border-[#8771FF] bg-white"
            : checked
              ? "bg-[#8771FF] border-[#8771FF] border-2"
              : "bg-white border-[#F0F2F6] hover:border-[#F0F2F6] border-2"
        }
      `}
      >
        {checked === "indeterminate" && (
          <Minus size={12} strokeWidth={2} className="text-[#8771FF]" />
        )}
        {checked === true && (
          <Check
            size={10}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white mt-[1px] ml-[.5px]"
          />
        )}
      </span>
    </label>
  );
}

