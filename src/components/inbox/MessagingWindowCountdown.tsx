"use client";

import { useEffect, useState } from "react";
import {
  formatMessagingWindowRemaining,
  getMessagingWindowState,
} from "@/lib/inbox/messagingWindow";

interface MessagingWindowCountdownProps {
  lastInboundAt?: string;
}

const PILL_CLASS =
  "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold";

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
        className={`${PILL_CLASS} bg-red-50 text-red-700`}
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
      className={`${PILL_CLASS} ${
        isWarning ? "bg-amber-50 text-amber-700" : "bg-[#F3F0FF] text-[#8771FF]"
      }`}
      title="Time left to reply before Instagram closes the human-agent messaging window for this lead."
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isWarning ? "bg-amber-500" : "bg-[#8771FF]"}`}
      />
      {formatMessagingWindowRemaining(state.remainingMs)} left
    </span>
  );
}
