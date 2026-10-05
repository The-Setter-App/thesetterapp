"use client";

import { useEffect, useState } from "react";

// The current time, refreshed on an interval so elapsed-time labels on screen
// keep moving without anything else having to change.
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}
