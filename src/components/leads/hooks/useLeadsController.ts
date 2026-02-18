"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getInboxConnectionState, getInboxUsers } from "@/app/actions/inbox";
import { getCachedLeads, getCachedLeadsTimestamp, setCachedLeads } from "@/lib/clientCache";
import { useSSE } from "@/hooks/useSSE";
import { mapInboxUsersToLeadRows } from "@/lib/leads/mapInboxUserToLeadRow";
import { isStatusType } from "@/lib/status/config";
import { CONVERSATION_STATUS_SYNCED_EVENT } from "@/lib/status/clientSync";
import type { LeadRow, SortConfig } from "@/types/leads";
import type { StatusType } from "@/types/status";

const SELECTED_IDS_STORAGE_KEY = "leads-selected-ids";
const LEADS_CACHE_TTL_MS = 2 * 60 * 1000;

function toRelativeInteractedFromTimestamp(timestampMs: number): string {
  const diffMs = Date.now() - timestampMs;
  if (!Number.isFinite(diffMs) || diffMs < 0) return "N/A";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds} sec${seconds === 1 ? "" : "s"} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function parseCashLabel(value: string): number {
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) ? numeric : -1;
}

function sortRows(rows: LeadRow[], sortConfig: SortConfig): LeadRow[] {
  if (!sortConfig) return rows;

  const { key, direction } = sortConfig;
  const next = [...rows];

  next.sort((a, b) => {
    if (key === "cash") {
      const aCash = parseCashLabel(a.cash);
      const bCash = parseCashLabel(b.cash);
      if (aCash < bCash) return direction === "asc" ? -1 : 1;
      if (aCash > bCash) return direction === "asc" ? 1 : -1;
      return 0;
    }

    if (key === "interacted" || key === "updatedAtMs") {
      const aUpdated = a.updatedAtMs ?? 0;
      const bUpdated = b.updatedAtMs ?? 0;
      if (aUpdated < bUpdated) return direction === "asc" ? -1 : 1;
      if (aUpdated > bUpdated) return direction === "asc" ? 1 : -1;
      return 0;
    }

    if (key === "messageCount") {
      const aCount = a.messageCount ?? 0;
      const bCount = b.messageCount ?? 0;
      if (aCount < bCount) return direction === "asc" ? -1 : 1;
      if (aCount > bCount) return direction === "asc" ? 1 : -1;
      return 0;
    }

    const aValue = String(a[key] ?? "").toLowerCase();
    const bValue = String(b[key] ?? "").toLowerCase();

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return next;
}

export function useLeadsController() {
  const [baseRows, setBaseRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoadSettled, setInitialLoadSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(true);

  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<StatusType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const refetchTimerRef = useRef<number | null>(null);

  const updateRows = useCallback((updater: (rows: LeadRow[]) => LeadRow[]) => {
    setBaseRows((prev) => {
      const next = updater(prev);
      setCachedLeads(next).catch((cacheError) => console.error("[Leads] Failed to cache leads:", cacheError));
      return next;
    });
  }, []);

  const loadRows = useCallback(async (options?: { force?: boolean }) => {
    try {
      setError(null);
      const force = options?.force === true;
      const [cachedLeads, cachedAt] = await Promise.all([
        getCachedLeads(),
        getCachedLeadsTimestamp(),
      ]);
      if (cachedLeads?.length) {
        setBaseRows(cachedLeads);
        setLoading(false);
      }
      if (!cachedLeads?.length) {
        setLoading(true);
      }

      const connection = await getInboxConnectionState();
      setHasConnectedAccounts(connection.hasConnectedAccounts);

      if (!connection.hasConnectedAccounts) {
        setBaseRows([]);
        setCachedLeads([]).catch((cacheError) => console.error("[Leads] Failed to clear leads cache:", cacheError));
        return;
      }

      const cacheIsFresh =
        typeof cachedAt === "number" && Date.now() - cachedAt < LEADS_CACHE_TTL_MS;
      if (!force && cachedLeads?.length && cacheIsFresh) {
        return;
      }

      const users = await getInboxUsers();
      const mapped = mapInboxUsersToLeadRows(users);
      setBaseRows(mapped);
      setCachedLeads(mapped).catch((cacheError) => console.error("[Leads] Failed to cache leads:", cacheError));
    } catch (loadError) {
      console.error("[Leads] Failed to load leads:", loadError);
      setError("Failed to load leads");
      setBaseRows([]);
    } finally {
      setLoading(false);
      setInitialLoadSettled(true);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(SELECTED_IDS_STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as string[];
      setSelectedIds(new Set(parsed));
    } catch {
      setSelectedIds(new Set());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SELECTED_IDS_STORAGE_KEY, JSON.stringify(Array.from(selectedIds)));
  }, [selectedIds]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const existingIds = new Set(baseRows.map((row) => row.id));
      const next = new Set(Array.from(prev).filter((id) => existingIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [baseRows]);

  const onToggleStatus = useCallback((status: StatusType) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]
    );
  }, []);

  const onSort = useCallback((key: keyof LeadRow) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  }, []);

  const filteredRows = useMemo(() => {
    let rows = [...baseRows];

    if (search.trim()) {
      const query = search.toLowerCase();
      rows = rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query) ||
          (row.handle || "").toLowerCase().includes(query) ||
          row.account.toLowerCase().includes(query)
      );
    }

    if (selectedStatuses.length > 0) {
      rows = rows.filter((row) => selectedStatuses.includes(row.status));
    }

    return sortRows(rows, sortConfig);
  }, [baseRows, search, selectedStatuses, sortConfig]);

  const statusCounts = useMemo(() => {
    const counts = new Map<StatusType, number>();
    for (const row of baseRows) {
      counts.set(row.status, (counts.get(row.status) || 0) + 1);
    }
    return counts;
  }, [baseRows]);

  const getStatusCount = useCallback(
    (status: StatusType) => statusCounts.get(status) || 0,
    [statusCounts]
  );

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onToggleAllVisible = useCallback(() => {
    const visibleIds = filteredRows.map((row) => row.id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => next.has(id));
      for (const id of visibleIds) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, [filteredRows]);

  const headerCheckboxState = useMemo((): boolean | "indeterminate" => {
    if (filteredRows.length === 0) return false;
    const selectedCount = filteredRows.filter((row) => selectedIds.has(row.id)).length;
    if (selectedCount === 0) return false;
    if (selectedCount === filteredRows.length) return true;
    return "indeterminate";
  }, [filteredRows, selectedIds]);

  const refreshRowTimestamp = useCallback((conversationId: string, timestampMs: number, fromMe: boolean) => {
    updateRows((prev) =>
      prev.map((row) => {
        if (row.id !== conversationId) return row;
        const nextCount = fromMe ? row.messageCount || 0 : (row.messageCount || 0) + 1;
        return {
          ...row,
          updatedAtMs: timestampMs,
          interacted: toRelativeInteractedFromTimestamp(timestampMs),
          messageCount: nextCount > 0 ? nextCount : undefined,
        };
      })
    );
  }, [updateRows]);

  useSSE("/api/sse", {
    onMessage: (message) => {
      if (message.type === "user_status_updated") {
        if (!isStatusType(message.data.status)) return;
        updateRows((prev) =>
          prev.map((row) =>
            row.id === message.data.conversationId ? { ...row, status: message.data.status } : row
          )
        );
      }

      if (message.type === "new_message" || message.type === "message_echo") {
        const eventTs = typeof message.data.timestamp === "number" ? message.data.timestamp : Date.now();
        const isFromMe = Boolean(message.data.fromMe) || message.type === "message_echo";

        const rowExists = baseRows.some((row) => row.id === message.data.conversationId);
        if (!rowExists) {
          if (refetchTimerRef.current) window.clearTimeout(refetchTimerRef.current);
          refetchTimerRef.current = window.setTimeout(() => {
            loadRows({ force: true });
          }, 500);
          return;
        }

        refreshRowTimestamp(message.data.conversationId, eventTs, isFromMe);
      }
    },
  });

  useEffect(() => {
    const handleLocalStatusSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId?: string; status?: StatusType }>;
      const conversationId = customEvent.detail?.conversationId;
      const nextStatus = customEvent.detail?.status;
      if (!conversationId || !isStatusType(nextStatus)) return;
      updateRows((prev) =>
        prev.map((row) =>
          row.id === conversationId ? { ...row, status: nextStatus } : row
        )
      );
    };

    window.addEventListener(CONVERSATION_STATUS_SYNCED_EVENT, handleLocalStatusSync);
    return () => {
      window.removeEventListener(CONVERSATION_STATUS_SYNCED_EVENT, handleLocalStatusSync);
    };
  }, [updateRows]);

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) {
        window.clearTimeout(refetchTimerRef.current);
      }
    };
  }, []);

  return {
    loading,
    initialLoadSettled,
    error,
    hasConnectedAccounts,
    baseRows,
    filteredRows,
    search,
    setSearch,
    selectedStatuses,
    onToggleStatus,
    sortConfig,
    onSort,
    isSelected,
    onToggleSelect,
    onToggleAllVisible,
    headerCheckboxState,
    getStatusCount,
    selectedCount: selectedIds.size,
    totalCount: baseRows.length,
    filteredCount: filteredRows.length,
    refresh: loadRows,
  };
}
