"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import InboxSidebar from "@/components/inbox/InboxSidebar";
import { InboxSyncProvider } from "@/components/inbox/InboxSyncContext";
import InboxSseBridge from "@/components/inbox/InboxSseBridge";

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
  const [hasCompletedInitialSync, setHasCompletedInitialSync] = useState(false);

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

  const shouldRequireGate = isConversationRoute && !hasCompletedInitialSync;

  useEffect(() => {
    if (!shouldRequireGate) return;
    setEpoch((prev) => prev + 1);
    setSidebarReady(false);
    setChatReady(false);
    setGateTimedOut(false);
  }, [selectedConversationId, shouldRequireGate]);

  useEffect(() => {
    if (gateTimerRef.current) {
      window.clearTimeout(gateTimerRef.current);
      gateTimerRef.current = null;
    }

    if (!shouldRequireGate || (sidebarReady && chatReady)) {
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
  }, [shouldRequireGate, sidebarReady, chatReady, epoch]);

  useEffect(() => {
    if (!shouldRequireGate) return;
    if (sidebarReady && chatReady) {
      setHasCompletedInitialSync(true);
      return;
    }
    if (gateTimedOut) {
      setHasCompletedInitialSync(true);
    }
  }, [shouldRequireGate, sidebarReady, chatReady, gateTimedOut]);

  const markSidebarReady = useCallback((readyEpoch: number) => {
    setSidebarReady((prev) => (readyEpoch === epoch ? true : prev));
  }, [epoch]);

  const markChatReady = useCallback((readyEpoch: number) => {
    setChatReady((prev) => (readyEpoch === epoch ? true : prev));
  }, [epoch]);

  const gateVisible = false;

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
      <InboxSseBridge />
      <div className="relative flex h-screen overflow-hidden bg-stone-50 font-sans text-stone-900">
        <div className="flex h-full w-full overflow-hidden">
          <InboxSidebar width={leftWidth} />
          <div
            className="hidden md:flex w-px cursor-ew-resize select-none touch-none bg-[#F0F2F6]"
            onMouseDown={handleLeftResizeStart}
            aria-label="Resize left sidebar"
            role="separator"
          />
          {children}
        </div>
      </div>
    </InboxSyncProvider>
  );
}

