"use client";

import { CalendarDays, Link2, Link2Off, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

interface CalendlyConnectionState {
  connected: boolean;
  connectedAt?: string;
  schedulingUrl?: string;
}

export default function CalendlyIntegrationCard() {
  const [state, setState] = useState<CalendlyConnectionState>({ connected: false });
  const [token, setToken] = useState("");
  const [schedulingUrl, setSchedulingUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadState() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        cache: "no-store",
      });
      const data = (await response.json()) as CalendlyConnectionState & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to load Calendly connection.");
      }
      setState({ connected: Boolean(data.connected), connectedAt: data.connectedAt, schedulingUrl: data.schedulingUrl });
      setSchedulingUrl(data.schedulingUrl || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Calendly connection.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadState().catch((loadError) => {
      console.error("[CalendlyIntegrationCard] Failed to load state:", loadError);
    });
  }, []);

  async function handleConnect() {
    if (!token.trim() || !schedulingUrl.trim()) {
      setError("Token and scheduling URL are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalAccessToken: token.trim(),
          schedulingUrl: schedulingUrl.trim(),
        }),
      });
      const data = (await response.json()) as CalendlyConnectionState & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect Calendly.");
      }
      setToken("");
      setState({
        connected: true,
        connectedAt: data.connectedAt,
        schedulingUrl: data.schedulingUrl,
      });
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to connect Calendly.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/settings/integrations/calendly", {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect Calendly.");
      }
      setState({ connected: false });
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect Calendly.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(135,113,255,0.1)] text-[#8771FF]">
            <CalendarDays size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#101011]">Calendly</p>
            <p className="mt-0.5 text-xs text-[#606266]">
              Send tracked booking links from Inbox and sync booked calls.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#F3F0FF] px-3 py-1 text-xs font-semibold text-[#8771FF]">
          {state.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center text-[#606266]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder={state.connected ? "Enter new PAT to rotate token" : "Calendly personal access token"}
            className="h-12 w-full rounded-xl border border-[#F0F2F6] bg-white px-4 text-sm text-[#101011] placeholder:text-[#9A9CA2] focus:outline-none"
          />
          <input
            type="url"
            value={schedulingUrl}
            onChange={(event) => setSchedulingUrl(event.target.value)}
            placeholder="https://calendly.com/your-handle/..."
            className="h-12 w-full rounded-xl border border-[#F0F2F6] bg-white px-4 text-sm text-[#101011] placeholder:text-[#9A9CA2] focus:outline-none"
          />

          <div className="flex flex-col gap-2 md:flex-row">
            <Button
              type="button"
              className="h-12 w-full md:w-auto"
              leftIcon={state.connected ? <Link2 size={16} /> : <Link2Off size={16} />}
              isLoading={saving}
              onClick={handleConnect}
            >
              {state.connected ? "Update connection" : "Connect Calendly"}
            </Button>
            {state.connected ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full md:w-auto"
                leftIcon={<Trash2 size={15} />}
                onClick={handleDisconnect}
                disabled={saving}
              >
                Disconnect
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
