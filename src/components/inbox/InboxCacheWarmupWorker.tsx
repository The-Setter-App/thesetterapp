"use client";

import { useEffect } from "react";
import {
  hasInboxCacheWarmupIntent,
  INBOX_CACHE_WARMUP_REQUEST_EVENT,
  readInboxCacheWarmupStatus,
  runInboxCacheWarmup,
} from "@/lib/inboxCacheWarmup";

export default function InboxCacheWarmupWorker() {
  useEffect(() => {
    const maybeStartWarmup = () => {
      const status = readInboxCacheWarmupStatus();
      if (!hasInboxCacheWarmupIntent() && status.state !== "running") return;

      runInboxCacheWarmup().catch((error) => {
        console.error("[InboxCacheWarmupWorker] Warmup failed:", error);
      });
    };

    maybeStartWarmup();
    window.addEventListener(INBOX_CACHE_WARMUP_REQUEST_EVENT, maybeStartWarmup);
    window.addEventListener("focus", maybeStartWarmup);

    return () => {
      window.removeEventListener(
        INBOX_CACHE_WARMUP_REQUEST_EVENT,
        maybeStartWarmup,
      );
      window.removeEventListener("focus", maybeStartWarmup);
    };
  }, []);

  return null;
}
