"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InboxSidebar from "@/components/inbox/InboxSidebar";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leftWidth, setLeftWidth] = useState(380);
  const isResizingLeftRef = useRef(false);

  const handleLeftResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    isResizingLeftRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
  }, []);

  const handleLeftResizeMove = useCallback((event: MouseEvent) => {
    if (!isResizingLeftRef.current) return;
    const nextWidth = Math.max(300, Math.min(560, event.clientX));
    setLeftWidth(nextWidth);
  }, []);

  const handleLeftResizeEnd = useCallback(() => {
    isResizingLeftRef.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleLeftResizeMove);
    window.addEventListener("mouseup", handleLeftResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleLeftResizeMove);
      window.removeEventListener("mouseup", handleLeftResizeEnd);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [handleLeftResizeMove, handleLeftResizeEnd]);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <InboxSidebar width={leftWidth} />
      <div
        className="group hidden md:flex w-3 -mx-1 cursor-ew-resize items-stretch justify-center select-none touch-none"
        onMouseDown={handleLeftResizeStart}
        aria-label="Resize left sidebar"
        role="separator"
      >
        <div className="w-px bg-stone-200 group-hover:bg-stone-300 transition-colors" />
      </div>
      {children}
    </div>
  );
}
