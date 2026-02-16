"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import InboxSidebar from "@/components/inbox/InboxSidebar";
import { InboxSyncProvider } from "@/components/inbox/InboxSyncContext";

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id?: string }>();
  const selectedConversationId = typeof params?.id === "string" ? params.id : null;
  const isConversationRoute = Boolean(selectedConversationId);

  const [leftWidth, setLeftWidth] = useState(380);
  const [epoch, setEpoch] = useState(0);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [gateTimedOut, setGateTimedOut] = useState(false);

  const isResizingLeftRef = useRef(false);
  const gateTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    setEpoch((prev) => prev + 1);
    setSidebarReady(false);
    setChatReady(false);
    setGateTimedOut(false);
  }, [selectedConversationId]);

  useEffect(() => {
    if (gateTimerRef.current) {
      window.clearTimeout(gateTimerRef.current);
      gateTimerRef.current = null;
    }

    if (!isConversationRoute || (sidebarReady && chatReady)) {
      return;
    }

    gateTimerRef.current = window.setTimeout(() => {
      console.warn("[InboxSync] Initial synchronized load timed out. Revealing UI.");
      setGateTimedOut(true);
    }, 8000);

    return () => {
      if (gateTimerRef.current) {
        window.clearTimeout(gateTimerRef.current);
        gateTimerRef.current = null;
      }
    };
  }, [isConversationRoute, sidebarReady, chatReady, epoch]);

  const markSidebarReady = useCallback((readyEpoch: number) => {
    setSidebarReady((prev) => (readyEpoch === epoch ? true : prev));
  }, [epoch]);

  const markChatReady = useCallback((readyEpoch: number) => {
    setChatReady((prev) => (readyEpoch === epoch ? true : prev));
  }, [epoch]);

  const gateVisible = isConversationRoute && !gateTimedOut && !(sidebarReady && chatReady);

  return (
    <InboxSyncProvider
      value={{
        epoch,
        selectedConversationId,
        gateVisible,
        markSidebarReady,
        markChatReady,
      }}
    >
      <div className="relative flex h-screen overflow-hidden bg-stone-50 font-sans text-stone-900">
        <div className={`flex h-full w-full overflow-hidden ${gateVisible ? "pointer-events-none opacity-0" : ""}`}>
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

        {gateVisible && (
          <InboxSkeletonOverlay leftWidth={leftWidth} />
        )}
      </div>
    </InboxSyncProvider>
  );
}

function InboxSkeletonOverlay({ leftWidth }: { leftWidth: number }) {
  return (
    <div className="absolute inset-0 z-20 flex h-full w-full overflow-hidden bg-stone-50">
      <aside
        className="hidden h-full flex-col border-r border-stone-200 bg-white md:flex"
        style={{ width: `${leftWidth}px` }}
      >
        <div className="space-y-2 border-b border-stone-100 px-4 py-4">
          <div className="h-6 w-24 animate-pulse rounded-lg bg-stone-200" />
          <div className="h-3 w-44 animate-pulse rounded bg-stone-100" />
        </div>
        <div className="border-b border-stone-100 px-4 py-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-stone-100" />
        </div>
        <div className="space-y-3 px-4 py-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-stone-200" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-28 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-44 animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="group hidden w-3 -mx-1 items-stretch justify-center md:flex">
        <div className="w-px bg-stone-200" />
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col bg-white">
        <div className="border-b border-stone-100 px-6 py-4">
          <div className="h-6 w-52 animate-pulse rounded-lg bg-stone-200" />
        </div>
        <div className="flex-1 space-y-4 overflow-hidden bg-stone-50 px-6 py-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className={`flex ${item % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className={`h-14 animate-pulse rounded-2xl ${item % 2 === 0 ? "w-52 bg-stone-300" : "w-64 bg-white border border-stone-100"}`} />
            </div>
          ))}
        </div>
        <div className="border-t border-stone-100 bg-white px-6 py-4">
          <div className="h-12 w-full animate-pulse rounded-2xl bg-stone-100" />
        </div>
      </div>
    </div>
  );
}
