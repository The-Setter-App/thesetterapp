"use client";

import { type ReactNode, useEffect, useId } from "react";
import { LuX } from "react-icons/lu";
import styles from "./brandSurface.module.css";

interface ModalShellProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  // Actions pinned to the bottom of the dialog.
  footer?: ReactNode;
  // Tailwind max-width class for the dialog on larger screens.
  maxWidthClassName?: string;
  // Tailwind z-index class, for a dialog opened from inside another overlay.
  layerClassName?: string;
}

// Frame shared by the app's dialogs: dimmed backdrop, rounded card, header
// with a close button, a scrolling body and an optional footer. Escape and a
// click on the backdrop both close it.
export default function ModalShell({
  title,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "md:max-w-md",
  layerClassName = "z-[90]",
}: ModalShellProps) {
  const titleId = useId();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-3 md:p-4 ${layerClassName}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#101011]/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`${styles.surface} ${styles.confirm} relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_rgba(16,16,17,0.2)] ${maxWidthClassName}`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-xl font-semibold tracking-[-0.02em] text-[#101011]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-[#606266]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:text-[#101011]"
          >
            <LuX aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {children}
        </div>

        {footer && (
          <div className="border-t border-[#F0F2F6] px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
