"use client";

import { CalendarDays, Link2, Link2Off, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CalendlyIntegrationInlinePanelProps {
  connected: boolean;
  schedulingUrl: string;
  credentialPreview: string;
  connectedAt?: string;
  saving: boolean;
  disconnecting: boolean;
  onSchedulingUrlChange: (value: string) => void;
  onSaveSchedulingUrl: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

function toConnectedAtLabel(value?: string): string {
  if (!value) return "Not connected";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Not connected";
  return parsed.toLocaleString();
}

export default function CalendlyIntegrationInlinePanel({
  connected,
  schedulingUrl,
  credentialPreview,
  connectedAt,
  saving,
  disconnecting,
  onSchedulingUrlChange,
  onSaveSchedulingUrl,
  onDisconnect,
}: CalendlyIntegrationInlinePanelProps) {
  if (!connected) {
    return (
      <div className="space-y-3 rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4 md:p-5">
        <div className="flex items-center gap-2 text-[#606266]">
          <Link2Off size={16} />
          <p className="text-sm font-medium">Calendly is not connected yet.</p>
        </div>
        <p className="text-sm text-[#606266]">
          Connect with OAuth to sync booking events into Inbox and Calendar.
        </p>
        <a
          href="/api/auth/calendly/login"
          className="inline-block w-full md:w-auto"
        >
          <Button
            type="button"
            className="h-12 w-full md:w-auto"
            leftIcon={<CalendarDays size={16} />}
          >
            Connect with Calendly
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm md:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
            Credential
          </p>
          <p className="mt-1 text-sm font-semibold text-[#101011]">
            {credentialPreview}
          </p>
        </div>
        <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
            Auth Method
          </p>
          <p className="mt-1 text-sm font-semibold text-[#101011]">OAuth 2.0</p>
        </div>
        <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
            Connected At
          </p>
          <p className="mt-1 text-sm font-semibold text-[#101011]">
            {toConnectedAtLabel(connectedAt)}
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="calendly-scheduling-url"
          className="mb-2 block text-sm font-medium text-[#101011]"
        >
          Scheduling URL
        </label>
        <input
          id="calendly-scheduling-url"
          name="calendly-scheduling-url"
          type="url"
          value={schedulingUrl}
          onChange={(event) => onSchedulingUrlChange(event.target.value)}
          placeholder="https://calendly.com/your-handle/your-event"
          className="h-12 w-full rounded-xl border border-[#F0F2F6] bg-white px-4 text-sm text-[#101011] placeholder:text-[#9A9CA2] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Button
          type="button"
          className="h-12 w-full md:w-auto"
          leftIcon={<Link2 size={16} />}
          isLoading={saving}
          onClick={onSaveSchedulingUrl}
          disabled={disconnecting}
        >
          Save URL
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full md:w-auto"
          leftIcon={<Trash2 size={15} />}
          isLoading={disconnecting}
          onClick={onDisconnect}
          disabled={saving}
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}
