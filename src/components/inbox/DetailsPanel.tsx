"use client";

import { useCallback, useEffect, useState } from "react";
import { User } from "@/types/inbox";
import type { ConversationContactDetails, ConversationDetails, ConversationTimelineEvent, PaymentDetails, StatusType } from "@/types/inbox";
import DetailsPanelHeader from "./details/DetailsPanelHeader";
import SummaryTab from "./details/SummaryTab";
import NotesTab from "./details/NotesTab";
import TimelineTab from "./details/TimelineTab";
import PaymentsTab from "./details/PaymentsTab";
import CallsTab from "./details/CallsTab";
import { useSSE } from "@/hooks/useSSE";

type DetailsTabName = "Summary" | "Notes" | "Timeline" | "Payments" | "Calls";

const DETAILS_TABS: DetailsTabName[] = ["Summary", "Notes", "Timeline", "Payments", "Calls"];

interface DetailsPanelProps {
  user: User;
  width?: number;
  syncedDetails?: ConversationDetails | null;
  syncedAt?: number;
}

export default function DetailsPanel({ user, width, syncedDetails, syncedAt }: DetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailsTabName>("Summary");
  const [notes, setNotes] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    amount: "",
    paymentMethod: "Fanbasis",
    payOption: "One Time",
    paymentFrequency: "One Time",
    setterPaid: "No",
    closerPaid: "No",
    paymentNotes: "",
  });
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<ConversationTimelineEvent[]>([]);
  const [contactDetails, setContactDetails] = useState<ConversationContactDetails>({
    phoneNumber: "",
    email: "",
  });
  const appendStatusTimelineEvent = useCallback((status: StatusType, idPrefix: string) => {
    const now = Date.now();
    setTimelineEvents((prev) => {
      const last = prev[prev.length - 1];
      if (last?.status === status) {
        const lastTs = new Date(last.timestamp).getTime();
        if (Number.isFinite(lastTs) && now - lastTs < 3000) return prev;
      }
      return [
        ...prev,
        {
          id: `${idPrefix}_${now}_${Math.random().toString(36).slice(2, 8)}`,
          type: "status_update",
          status,
          title: status,
          sub: `Status changed to ${status}`,
          timestamp: new Date(now).toISOString(),
        },
      ];
    });
  }, []);

  useEffect(() => {
    const recipientId = user.recipientId;
    if (!recipientId) return;

    let active = true;
    setDetailsLoaded(false);

    const applyDetails = (details: ConversationDetails | null | undefined) => {
      setNotes(details?.notes ?? "");
      setPaymentDetails({
        amount: details?.paymentDetails?.amount ?? "",
        paymentMethod: details?.paymentDetails?.paymentMethod ?? "Fanbasis",
        payOption: details?.paymentDetails?.payOption ?? "One Time",
        paymentFrequency: details?.paymentDetails?.paymentFrequency ?? "One Time",
        setterPaid: details?.paymentDetails?.setterPaid ?? "No",
        closerPaid: details?.paymentDetails?.closerPaid ?? "No",
        paymentNotes: details?.paymentDetails?.paymentNotes ?? "",
      });
      setTimelineEvents(Array.isArray(details?.timelineEvents) ? details.timelineEvents : []);
      setContactDetails({
        phoneNumber: details?.contactDetails?.phoneNumber ?? "",
        email: details?.contactDetails?.email ?? "",
      });
    };

    if (syncedDetails) {
      applyDetails(syncedDetails);
      setDetailsLoaded(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(recipientId)}/details`);
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        applyDetails(data.details);
      } catch (error) {
        console.error("[DetailsPanel] Failed to fetch details:", error);
      } finally {
        if (active) setDetailsLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [syncedDetails, syncedAt, user.recipientId]);

  useEffect(() => {
    if (!detailsLoaded || !user.recipientId) return;

    const timeout = window.setTimeout(async () => {
      try {
        await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId!)}/details`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save notes:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [notes, detailsLoaded, user.recipientId]);

  useEffect(() => {
    if (!detailsLoaded || !user.recipientId) return;

    const timeout = window.setTimeout(async () => {
      try {
        await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId!)}/details`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentDetails }),
        });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save payment details:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [paymentDetails, detailsLoaded, user.recipientId]);

  useEffect(() => {
    if (!detailsLoaded || !user.recipientId) return;

    const timeout = window.setTimeout(async () => {
      try {
        await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId!)}/details`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactDetails }),
        });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save contact details:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [contactDetails, detailsLoaded, user.recipientId]);

  useSSE("/api/sse", {
    onMessage: (message) => {
      if (message.type !== "user_status_updated") return;
      if (message.data.userId !== user.recipientId) return;
      appendStatusTimelineEvent(message.data.status, "status_sse");
    },
  });

  useEffect(() => {
    const handleLocalStatus = (event: Event) => {
      const custom = event as CustomEvent<{ userId?: string; status?: StatusType }>;
      if (!custom.detail?.userId || custom.detail.userId !== user.recipientId || !custom.detail.status) return;
      appendStatusTimelineEvent(custom.detail.status, "status_local");
    };

    window.addEventListener("userStatusUpdated", handleLocalStatus);
    return () => window.removeEventListener("userStatusUpdated", handleLocalStatus);
  }, [appendStatusTimelineEvent, user.recipientId]);

  const getTabButtonClass = (tabName: DetailsTabName) => {
    const isActive = activeTab === tabName;
    return isActive
      ? "px-5 py-1.5 bg-[#8771FF] text-white rounded-full shadow-md text-xs font-semibold"
      : "px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer";
  };

  const handleClearTimeline = useCallback(async () => {
    if (!user.recipientId) return;
    setTimelineEvents([]);
    try {
      await fetch(`/api/inbox/conversations/${encodeURIComponent(user.recipientId)}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timelineEvents: [] }),
      });
    } catch (error) {
      console.error("[DetailsPanel] Failed to clear timeline:", error);
    }
  }, [user.recipientId]);

  return (
    <aside
      className="bg-white flex flex-col flex-shrink-0 relative"
      style={width ? { width: `${width}px` } : { width: "400px" }}
    >
      {/* Header: Avatar, Name, Status, Contacts, Setter/Closer */}
      <DetailsPanelHeader user={user} contactDetails={contactDetails} onChangeContactDetails={setContactDetails} />

      <hr className="border-gray-200" />

      {/* Tab Bar */}
      <div className="flex items-center justify-around px-2 py-2 border-b border-gray-200 text-sm font-semibold text-gray-500">
        {DETAILS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={getTabButtonClass(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col">
        {activeTab === "Summary" && <SummaryTab />}
        {activeTab === "Notes" && <NotesTab notes={notes} onChange={setNotes} />}
        {activeTab === "Timeline" && <TimelineTab events={timelineEvents} onClear={handleClearTimeline} />}
        {activeTab === "Payments" && <PaymentsTab value={paymentDetails} onChange={setPaymentDetails} />}
        {activeTab === "Calls" && <CallsTab />}
      </div>
    </aside>
  );
}
