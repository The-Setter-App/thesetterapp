"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearCachedCalendlySettingsState,
  getCachedCalendlySettingsState,
  setCachedCalendlySettingsState,
} from "@/lib/settings/calendlySettingsClientCache";

const CALENDLY_SETTINGS_URL = "/api/settings/integrations/calendly";

export interface CalendlyConnection {
  connected: boolean;
  connectedAt?: string;
  schedulingUrl?: string;
}

interface CalendlyApiResult extends Partial<CalendlyConnection> {
  credentialPreview?: string;
  error?: string;
}

interface UseCalendlyIntegrationOptions {
  initialSuccessMessage: string;
  initialErrorMessage: string;
}

export interface CalendlyIntegrationController {
  connection: CalendlyConnection;
  // True until the first answer about the connection has arrived.
  loading: boolean;
  saving: boolean;
  disconnecting: boolean;
  successMessage: string;
  errorMessage: string;
  schedulingUrlDraft: string;
  setSchedulingUrlDraft: (value: string) => void;
  saveSchedulingUrl: () => Promise<void>;
  disconnect: () => Promise<void>;
}

async function readResult(response: Response): Promise<CalendlyApiResult> {
  const body: CalendlyApiResult | null = await response
    .json()
    .catch(() => null);
  return body ?? {};
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Loads the workspace's Calendly connection and saves changes to it. The
// last answer is kept for the browser session so the tab opens instantly.
export function useCalendlyIntegration({
  initialSuccessMessage,
  initialErrorMessage,
}: UseCalendlyIntegrationOptions): CalendlyIntegrationController {
  const [connection, setConnection] = useState<CalendlyConnection>({
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [schedulingUrlDraft, setSchedulingUrlDraft] = useState("");

  const applyConnection = useCallback((result: CalendlyApiResult) => {
    const next = {
      connected: Boolean(result.connected),
      connectedAt: result.connectedAt,
      schedulingUrl: result.schedulingUrl,
      credentialPreview: result.credentialPreview,
    };
    setConnection(next);
    setSchedulingUrlDraft(next.schedulingUrl ?? "");
    setCachedCalendlySettingsState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // The session cache is read here, after mount, because the server has
    // no access to it and the first render must match on both sides.
    const cached = getCachedCalendlySettingsState();
    if (cached.state) {
      setConnection(cached.state);
      setSchedulingUrlDraft(cached.state.schedulingUrl ?? "");
      setLoading(false);
      if (cached.fresh) return;
    }

    async function load() {
      try {
        const response = await fetch(CALENDLY_SETTINGS_URL, {
          cache: "no-store",
        });
        const result = await readResult(response);
        if (!response.ok) {
          throw new Error(result.error || "Failed to load Calendly settings.");
        }
        if (!cancelled) applyConnection(result);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            toMessage(error, "Failed to load Calendly settings."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [applyConnection]);

  const saveSchedulingUrl = useCallback(async () => {
    if (!connection.connected) return;

    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch(CALENDLY_SETTINGS_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingUrl: schedulingUrlDraft.trim() }),
      });
      const result = await readResult(response);
      if (!response.ok) {
        throw new Error(result.error || "Failed to update scheduling link.");
      }
      applyConnection({ ...result, connected: true });
      setSuccessMessage("Scheduling link saved.");
    } catch (error) {
      setErrorMessage(toMessage(error, "Failed to update scheduling link."));
    } finally {
      setSaving(false);
    }
  }, [applyConnection, connection.connected, schedulingUrlDraft]);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch(CALENDLY_SETTINGS_URL, {
        method: "DELETE",
      });
      const result = await readResult(response);
      if (!response.ok) {
        throw new Error(result.error || "Failed to disconnect Calendly.");
      }
      setConnection({ connected: false });
      setSchedulingUrlDraft("");
      clearCachedCalendlySettingsState();
      setSuccessMessage("Calendly disconnected.");
    } catch (error) {
      setErrorMessage(toMessage(error, "Failed to disconnect Calendly."));
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return {
    connection,
    loading,
    saving,
    disconnecting,
    successMessage,
    errorMessage,
    schedulingUrlDraft,
    setSchedulingUrlDraft,
    saveSchedulingUrl,
    disconnect,
  };
}
