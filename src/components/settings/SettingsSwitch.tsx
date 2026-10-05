"use client";

interface SettingsSwitchProps {
  checked: boolean;
  onChange: () => void;
  // Read out by screen readers, since the switch has no visible text.
  label: string;
  disabled?: boolean;
}

// An on/off switch. The 44px-tall button is the touch target; the track is
// drawn inside it.
export default function SettingsSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="flex h-11 w-[3.25rem] shrink-0 items-center justify-center outline-none disabled:opacity-50"
    >
      <span
        className={`relative h-[1.875rem] w-[3.25rem] rounded-full transition-colors duration-200 ease-out ${
          checked ? "bg-[#8771FF]" : "bg-[#E4E7EC]"
        }`}
      >
        <span
          className={`absolute left-[0.1875rem] top-[0.1875rem] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(16,16,17,0.2)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
