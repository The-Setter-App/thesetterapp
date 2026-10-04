"use client";

import { useDashboardSnapshot } from "@/components/dashboard/hooks/useDashboardSnapshot";
import type { DashboardSnapshot } from "@/types/dashboard";
import DashboardView from "./DashboardView";
import NoConnectedAccountsState from "./NoConnectedAccountsState";

interface DashboardClientProps {
  displayName: string;
  snapshot: DashboardSnapshot;
}

// Keeps the snapshot fresh in the browser and picks which state to show.
export default function DashboardClient({
  displayName,
  snapshot: initialSnapshot,
}: DashboardClientProps) {
  const snapshot = useDashboardSnapshot(initialSnapshot);

  if (!snapshot.hasConnectedAccounts) {
    return <NoConnectedAccountsState displayName={displayName} />;
  }

  return <DashboardView displayName={displayName} snapshot={snapshot} />;
}
