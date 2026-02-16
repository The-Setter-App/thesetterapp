"use client";

import { useEffect } from "react";
import { removeCachedConversationsByAccount } from "@/lib/clientCache";

export default function DisconnectCacheCleanup({
  disconnectedAccountId,
}: {
  disconnectedAccountId?: string;
}) {
  useEffect(() => {
    if (!disconnectedAccountId) return;
    removeCachedConversationsByAccount(disconnectedAccountId).catch((error) => {
      console.error("[DisconnectCacheCleanup] Failed to clear IndexedDB cache:", error);
    });
  }, [disconnectedAccountId]);

  return null;
}
