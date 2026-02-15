"use client";

import { useState } from "react";
import { User } from "@/types/inbox";
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
        {activeTab === "Notes" && <NotesTab />}
        {activeTab === "Timeline" && <TimelineTab />}
        {activeTab === "Payments" && <PaymentsTab />}
        {activeTab === "Calls" && <CallsTab />}
      </div>
    </aside>
  );
}
