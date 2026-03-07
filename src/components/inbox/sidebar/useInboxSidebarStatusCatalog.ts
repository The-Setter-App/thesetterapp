import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildStatusLookup,
  loadInboxStatusCatalog,
} from "@/lib/inbox/clientStatusCatalog";
import { subscribeInboxStatusCatalogChanged } from "@/lib/inbox/clientStatusCatalogSync";
import { PRESET_TAG_ROWS } from "@/lib/tags/config";
import type { TagRow } from "@/types/tags";

interface UseInboxSidebarStatusCatalogResult {
  statusCatalog: TagRow[];
  statusLookup: Record<string, TagRow>;
}

export default function useInboxSidebarStatusCatalog(): UseInboxSidebarStatusCatalogResult {
  const [statusCatalog, setStatusCatalog] = useState<TagRow[]>(PRESET_TAG_ROWS);
  const [statusLookup, setStatusLookup] = useState<Record<string, TagRow>>(() =>
    buildStatusLookup(PRESET_TAG_ROWS),
  );
  const statusCatalogRefreshInFlightRef = useRef(false);

  const refreshStatusCatalog = useCallback(async () => {
    if (statusCatalogRefreshInFlightRef.current) return;

    statusCatalogRefreshInFlightRef.current = true;
    try {
      const statuses = await loadInboxStatusCatalog();
      setStatusCatalog(statuses);
      setStatusLookup(buildStatusLookup(statuses));
    } catch (error) {
      console.error("Failed to load inbox statuses:", error);
    } finally {
      statusCatalogRefreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshStatusCatalog().catch((error) =>
      console.error("Failed to initialize inbox statuses:", error),
    );
  }, [refreshStatusCatalog]);

  useEffect(() => {
    return subscribeInboxStatusCatalogChanged((statuses) => {
      if (Array.isArray(statuses)) {
        setStatusCatalog(statuses);
        setStatusLookup(buildStatusLookup(statuses));
        return;
      }

      refreshStatusCatalog().catch((error) =>
        console.error(
          "Failed to refresh inbox statuses after catalog update:",
          error,
        ),
      );
    });
  }, [refreshStatusCatalog]);

  return {
    statusCatalog,
    statusLookup,
  };
}
