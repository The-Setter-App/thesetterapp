import type { InputHTMLAttributes } from "react";

type EmailInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type" | "className"
>;

interface EmailPillFieldProps {
  id: string;
  // Read by screen readers; the placeholder is the only visible hint.
  label: string;
  buttonLabel: string;
  buttonDisabled?: boolean;
  hasError?: boolean;
  inputProps?: EmailInputProps;
}

// Email input with its submit button. On phones the two stack as full-width
// controls; from `sm` up they merge into one pill with the button inside it.
export default function EmailPillField({
  id,
  label,
  buttonLabel,
  buttonDisabled = false,
  hasError = false,
  inputProps,
}: EmailPillFieldProps) {
  return (
    <div
      className={`flex flex-col gap-2.5 transition-colors duration-150 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:bg-white sm:p-1.5 sm:pl-6 sm:shadow-sm ${
        hasError
          ? "sm:border-red-300"
          : "sm:border-[#F0F2F6] sm:focus-within:border-[#8771FF]"
      }`}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="you@company.com"
        {...inputProps}
        id={id}
        type="email"
        className={`h-[3.25rem] w-full min-w-0 rounded-full border bg-white px-5 text-[1.0625rem] text-[#101011] shadow-sm outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] disabled:opacity-60 sm:h-11 sm:flex-1 sm:border-0 sm:bg-transparent sm:px-0 sm:text-base sm:shadow-none ${
          hasError
            ? "border-red-300"
            : "border-[#F0F2F6] focus:border-[#8771FF]"
        }`}
      />
      <button
        type="submit"
        disabled={buttonDisabled}
        className="h-[3.25rem] w-full shrink-0 rounded-full bg-[#8771FF] px-6 text-[1.0625rem] font-semibold text-white transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 sm:h-11 sm:w-auto sm:min-w-[10rem] sm:text-base sm:font-medium [@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
