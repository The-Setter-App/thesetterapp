"use client";

import { useCallback, useRef, useState } from "react";
import InboxSidebar from "@/components/inbox/InboxSidebar";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leftWidth, setLeftWidth] = useState(380);
  const isResizingLeftRef = useRef(false);

  const handleLeftResizeStart = useCallback(() => {
    isResizingLeftRef.current = true;
  }, []);

  const handleLeftResizeMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizingLeftRef.current) return;
    const nextWidth = Math.max(300, Math.min(560, event.clientX));
    setLeftWidth(nextWidth);
  }, []);

  const handleLeftResizeEnd = useCallback(() => {
    isResizingLeftRef.current = false;
  }, []);

  return (
    <div
      className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden"
      onMouseMove={handleLeftResizeMove}
      onMouseUp={handleLeftResizeEnd}
      onMouseLeave={handleLeftResizeEnd}
    >
      <InboxSidebar width={leftWidth} />
      <div
        className="hidden md:block w-1 cursor-col-resize bg-stone-200 hover:bg-stone-300 transition-colors"
        onMouseDown={handleLeftResizeStart}
        aria-label="Resize left sidebar"
        role="separator"
      />
      {children}
    </div>
  );
}
