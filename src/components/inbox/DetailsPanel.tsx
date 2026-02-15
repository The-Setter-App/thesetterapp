"use client";

import { useEffect, useState } from "react";
import { User } from "@/types/inbox";
import type { PaymentDetails } from "@/types/inbox";
import DetailsPanelHeader from "./details/DetailsPanelHeader";
import SummaryTab from "./details/SummaryTab";
import NotesTab from "./details/NotesTab";
import TimelineTab from "./details/TimelineTab";
import PaymentsTab from "./details/PaymentsTab";
import CallsTab from "./details/CallsTab";

type DetailsTabName = "Summary" | "Notes" | "Timeline" | "Payments" | "Calls";

const DETAILS_TABS: DetailsTabName[] = ["Summary", "Notes", "Timeline", "Payments", "Calls"];

interface DetailsPanelProps {
  user: User;
  width?: number;
}

export default function DetailsPanel({ user, width }: DetailsPanelProps) {
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

  useEffect(() => {
    let active = true;
    const recipientId = user.recipientId;

    if (!recipientId) return;

    setDetailsLoaded(false);

    (async () => {
      try {
        const res = await fetch(`/api/inbox/conversations/${encodeURIComponent(recipientId)}/details`);
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;

        setNotes(data.details?.notes ?? "");
        setPaymentDetails({
          amount: data.details?.paymentDetails?.amount ?? "",
          paymentMethod: data.details?.paymentDetails?.paymentMethod ?? "Fanbasis",
          payOption: data.details?.paymentDetails?.payOption ?? "One Time",
          paymentFrequency: data.details?.paymentDetails?.paymentFrequency ?? "One Time",
          setterPaid: data.details?.paymentDetails?.setterPaid ?? "No",
          closerPaid: data.details?.paymentDetails?.closerPaid ?? "No",
          paymentNotes: data.details?.paymentDetails?.paymentNotes ?? "",
        });
      } catch (error) {
        console.error("[DetailsPanel] Failed to fetch details:", error);
      } finally {
        if (active) setDetailsLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [user.recipientId]);

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

  const getTabButtonClass = (tabName: DetailsTabName) => {
    const isActive = activeTab === tabName;
    return isActive
      ? "px-5 py-1.5 bg-[#8771FF] text-white rounded-full shadow-md text-xs font-semibold"
      : "px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer";
  };

  return (
    <aside
      className="bg-white flex flex-col flex-shrink-0 relative"
      style={width ? { width: `${width}px` } : { width: "400px" }}
    >
      {/* Header: Avatar, Name, Status, Contacts, Setter/Closer */}
      <DetailsPanelHeader user={user} />

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
        {activeTab === "Timeline" && <TimelineTab />}
        {activeTab === "Payments" && <PaymentsTab value={paymentDetails} onChange={setPaymentDetails} />}
        {activeTab === "Calls" && <CallsTab />}
      </div>
    </aside>
  );
}
