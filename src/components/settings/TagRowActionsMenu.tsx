"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TagRowActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  disableEdit?: boolean;
  disableDelete?: boolean;
  deleteLabel?: string;
}

export default function TagRowActionsMenu({
  onEdit,
  onDelete,
  disableEdit = false,
  disableDelete = false,
  deleteLabel = "Delete",
}: TagRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    minWidth: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minimumWidth = Math.max(triggerRect.width, 150);

    let left = triggerRect.right - minimumWidth;
    left = Math.max(8, Math.min(left, viewportWidth - minimumWidth - 8));

    const estimatedMenuHeight = 96;
    const hasSpaceBelow =
      viewportHeight - triggerRect.bottom >= estimatedMenuHeight + 8;
    const top = hasSpaceBelow
      ? triggerRect.bottom + 6
      : Math.max(8, triggerRect.top - estimatedMenuHeight - 6);

    setMenuPosition({
      top,
      left,
      minWidth: minimumWidth,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updateMenuPosition();
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapeKey);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapeKey);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open tag actions"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#F0F2F6] text-[#606266] transition-colors hover:bg-[#F8F7FF]"
        onClick={() => setOpen((previous) => !previous)}
      >
        <MoreVertical size={16} />
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="z-[1100] rounded-xl border border-[#F0F2F6] bg-white p-1.5 shadow-sm"
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                minWidth: menuPosition.minWidth,
              }}
            >
              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-[#606266] transition-colors hover:bg-[#F8F7FF] disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
                disabled={disableEdit}
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                disabled={disableDelete}
              >
                <Trash2 size={14} />
                {deleteLabel}
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
