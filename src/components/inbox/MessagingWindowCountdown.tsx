"use client";

import { useEffect, useState } from "react";
import {
  formatMessagingWindowRemaining,
  getMessagingWindowState,
} from "@/lib/inbox/messagingWindow";

interface MessagingWindowCountdownProps {
  lastInboundAt?: string;
}

export default function MessagingWindowCountdown({
  lastInboundAt,
}: MessagingWindowCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastInboundAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, [lastInboundAt]);

  const state = getMessagingWindowState(lastInboundAt, now);
  if (!state) return null;

  if (state.status === "closed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600"
        title="More than 7 days since this lead's last message — Instagram no longer allows a human-agent reply here."
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Window closed
      </span>
    );
  }

  const isWarning = state.status === "urgent";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-green-200 bg-green-50 text-green-700"
      }`}
      title="Time left to reply before Instagram closes the human-agent messaging window for this lead."
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isWarning ? "bg-amber-500" : "bg-green-500"}`}
      />
      {formatMessagingWindowRemaining(state.remainingMs)} left
    </span>
  );
}
