"use client";

import { CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendlyIntegrationInlinePanel from "@/components/settings/CalendlyIntegrationInlinePanel";
import {
  clearCachedCalendlySettingsState,
  getCachedCalendlySettingsState,
  setCachedCalendlySettingsState,
} from "@/lib/settings/calendlySettingsClientCache";

interface CalendlySettingsState {
  connected: boolean;
  connectedAt?: string;
  schedulingUrl?: string;
  credentialPreview?: string;
}

interface IntegrationHubTableProps {
  initialSuccessMessage?: string;
  initialErrorMessage?: string;
}

function toUpdatedLabel(value?: string): string {
  if (!value) return "--";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "--";
  return parsed.toLocaleString();
}

export default function IntegrationHubTable({
  initialSuccessMessage = "",
  initialErrorMessage = "",
}: IntegrationHubTableProps) {
  const cachedState = useMemo(() => getCachedCalendlySettingsState(), []);
  const [rowOpen, setRowOpen] = useState(false);
  const [loading, setLoading] = useState(cachedState.state === null);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [success, setSuccess] = useState(initialSuccessMessage);
  const [error, setError] = useState(initialErrorMessage);
  const [schedulingUrlDraft, setSchedulingUrlDraft] = useState(
    cachedState.state?.schedulingUrl || "",
  );
  const [calendlyState, setCalendlyState] = useState<CalendlySettingsState>(
    cachedState.state ?? {
      connected: false,
    },
  );

  const loadState = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        cache: "no-store",
      });
      const data = (await response.json()) as CalendlySettingsState & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to load Calendly settings.");
      }

      const nextState = {
        connected: Boolean(data.connected),
        connectedAt: data.connectedAt,
        schedulingUrl: data.schedulingUrl,
        credentialPreview: data.credentialPreview,
      };
      setCalendlyState(nextState);
      setSchedulingUrlDraft(data.schedulingUrl || "");
      setCachedCalendlySettingsState(nextState);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Calendly settings.",
      );
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (cachedState.state && cachedState.fresh) {
      return;
    }
    loadState({ silent: Boolean(cachedState.state) }).catch((loadError) => {
      console.error("[IntegrationHubTable] Failed to load state:", loadError);
    });
  }, [cachedState.fresh, cachedState.state, loadState]);

  async function handleSaveSchedulingUrl() {
    if (!calendlyState.connected) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedulingUrl: schedulingUrlDraft.trim(),
        }),
      });
      const data = (await response.json()) as CalendlySettingsState & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to update scheduling URL.");
      }

      const nextState = {
        connected: true,
        connectedAt: data.connectedAt,
        schedulingUrl: data.schedulingUrl,
        credentialPreview: data.credentialPreview,
      };
      setCalendlyState(nextState);
      setSchedulingUrlDraft(data.schedulingUrl || "");
      setCachedCalendlySettingsState(nextState);
      setSuccess("Calendly scheduling URL updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update scheduling URL.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect Calendly.");
      }

      setCalendlyState({ connected: false });
      setSchedulingUrlDraft("");
      clearCachedCalendlySettingsState();
      setSuccess("Calendly disconnected.");
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect Calendly.",
      );
    } finally {
      setDisconnecting(false);
    }
  }

  const statusLabel = calendlyState.connected ? "Connected" : "Not connected";
  const credentialLabel = calendlyState.connected
    ? calendlyState.credentialPreview || "OAuth ********"
    : "Not set";
  const updatedLabel = useMemo(
    () => toUpdatedLabel(calendlyState.connectedAt),
    [calendlyState.connectedAt],
  );

  return (
    <div className="space-y-4">
      {success ? (
        <div className="rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0F2F6] bg-[#F8F7FF] px-4 py-3 md:px-6">
          <p className="text-sm font-semibold text-[#101011]">
            Available integrations
          </p>
          <span className="rounded-full bg-[rgba(135,113,255,0.1)] px-3 py-1 text-xs font-semibold text-[#8771FF]">
            1 active option
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-[#F0F2F6] bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266] md:px-6">
                  Integration
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Auth
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Credential
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#606266]">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                className="cursor-pointer border-b border-[#F0F2F6] transition-colors hover:bg-[#FAFAFF]"
                onClick={() => setRowOpen((current) => !current)}
              >
                <td className="px-4 py-3 md:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
                      <CalendarDays size={17} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#101011]">
                        Calendly
                      </p>
                      <p className="text-xs text-[#606266]">
                        Click row to configure
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-[#101011]">Calendar</td>
                <td className="px-4 py-3 text-sm text-[#101011]">OAuth 2.0</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      calendlyState.connected
                        ? "bg-[#F3F0FF] text-[#8771FF]"
                        : "bg-[#F8F7FF] text-[#606266]"
                    }`}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-[#101011]">
                  {credentialLabel}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#606266]">
                      {updatedLabel}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-[#8771FF] transition-transform ${
                        rowOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </td>
              </tr>

              {rowOpen ? (
                <tr>
                  <td colSpan={6} className="bg-[#FAFAFF] px-4 py-4 md:px-6">
                    {loading ? (
                      <div className="flex h-20 items-center justify-center text-[#606266]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : (
                      <CalendlyIntegrationInlinePanel
                        connected={calendlyState.connected}
                        schedulingUrl={schedulingUrlDraft}
                        credentialPreview={credentialLabel}
                        connectedAt={calendlyState.connectedAt}
                        saving={saving}
                        disconnecting={disconnecting}
                        onSchedulingUrlChange={setSchedulingUrlDraft}
                        onSaveSchedulingUrl={handleSaveSchedulingUrl}
                        onDisconnect={handleDisconnect}
                      />
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
