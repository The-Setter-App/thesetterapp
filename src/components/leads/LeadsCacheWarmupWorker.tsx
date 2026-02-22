"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { runLeadsCacheWarmup } from "@/lib/leads/cacheWarmup";

interface LeadsCacheWarmupWorkerProps {
  enabled: boolean;
}

export default function LeadsCacheWarmupWorker({
  enabled,
}: LeadsCacheWarmupWorkerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;
    if (pathname?.startsWith("/leads")) return;

    const maybeWarmup = () => {
      runLeadsCacheWarmup().catch((error) => {
        console.error("[LeadsCacheWarmupWorker] Warmup failed:", error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeWarmup();
      }
    };

    maybeWarmup();
    window.addEventListener("focus", maybeWarmup);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", maybeWarmup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pathname]);

  return null;
}
