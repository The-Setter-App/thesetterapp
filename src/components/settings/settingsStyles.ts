// Class strings shared by the settings screens, so every form field, label
// and button in Settings looks the same.

export const SETTINGS_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#F0F2F6] bg-white px-3.5 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:outline-none focus:ring-0 disabled:opacity-60";

export const SETTINGS_TEXTAREA_CLASS =
  "w-full resize-none rounded-xl border border-[#F0F2F6] bg-white px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:outline-none focus:ring-0 disabled:opacity-60";

export const SETTINGS_LABEL_CLASS =
  "mb-1.5 block text-[0.8125rem] font-medium text-[#101011]";

export const SETTINGS_HINT_CLASS = "mt-1.5 text-xs leading-snug text-[#606266]";

// Padding for a block inside a section card.
export const SETTINGS_BLOCK_CLASS = "px-5 py-5 md:px-6";

export const SETTINGS_PRIMARY_BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]";

export const SETTINGS_SECONDARY_BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#F4F5F8] px-5 text-sm font-semibold text-[#101011] outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)]:enabled:hover:bg-[#ECEEF3]";

export const SETTINGS_ICON_BUTTON_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] disabled:opacity-50";
