import { revalidateTag } from "next/cache";

export const DASHBOARD_SNAPSHOT_CACHE_TAG = "dashboard-snapshot-v1";
export const DASHBOARD_SNAPSHOT_TTL_SECONDS = 30;

export function revalidateDashboardSnapshotCache(): void {
  revalidateTag(DASHBOARD_SNAPSHOT_CACHE_TAG, { expire: 0 });
}
