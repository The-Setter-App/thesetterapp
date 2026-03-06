import { useEffect, useState } from "react";

interface CalendlyConnectionState {
  connected: boolean;
  canManageIntegration: boolean;
  loading: boolean;
}

interface StoredCalendlyConnectionState {
  connected: boolean;
  canManageIntegration: boolean;
  updatedAt: number;
}

const CALENDLY_CONNECTION_STATE_KEY = "setterapp_calendly_connection_state";
const STORED_STATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readStoredState(): StoredCalendlyConnectionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CALENDLY_CONNECTION_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCalendlyConnectionState>;
    if (
      typeof parsed.connected !== "boolean" ||
      typeof parsed.canManageIntegration !== "boolean" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.updatedAt > STORED_STATE_MAX_AGE_MS) {
      return null;
    }
    return {
      connected: parsed.connected,
      canManageIntegration: parsed.canManageIntegration,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writeStoredState(value: {
  connected: boolean;
  canManageIntegration: boolean;
}): void {
  if (typeof window === "undefined") return;
  const payload: StoredCalendlyConnectionState = {
    connected: value.connected,
    canManageIntegration: value.canManageIntegration,
    updatedAt: Date.now(),
  };
  window.localStorage.setItem(
    CALENDLY_CONNECTION_STATE_KEY,
    JSON.stringify(payload),
  );
}

export function useCalendlyConnectionState(): CalendlyConnectionState {
  const stored = readStoredState();
  const [connected, setConnected] = useState(stored?.connected ?? false);
  const [canManageIntegration, setCanManageIntegration] = useState(
    stored?.canManageIntegration ?? false,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/inbox/calendly/connection-state", {
          cache: "no-store",
        });
        if (!response.ok || !active) return;
        const data = (await response.json()) as {
          connected?: boolean;
          canManageIntegration?: boolean;
        };
        if (!active) return;
        const nextConnected = Boolean(data.connected);
        const nextCanManage = Boolean(data.canManageIntegration);
        setConnected(nextConnected);
        setCanManageIntegration(nextCanManage);
        writeStoredState({
          connected: nextConnected,
          canManageIntegration: nextCanManage,
        });
      } catch (error) {
        console.error(
          "[useCalendlyConnectionState] Failed to fetch state:",
          error,
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { connected, canManageIntegration, loading };
}
