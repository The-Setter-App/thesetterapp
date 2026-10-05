"use client";

import { CalendarDays } from "lucide-react";
import type { FormEvent } from "react";
import { useCalendlyIntegration } from "@/components/settings/integrations/useCalendlyIntegration";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_HINT_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";

interface CalendlyIntegrationSectionProps {
  initialSuccessMessage?: string;
  initialErrorMessage?: string;
}

function formatConnectedSince(value: string | undefined): string {
  if (!value) return "Connected";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "Connected";
  return `Connected since ${parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
}

export default function CalendlyIntegrationSection({
  initialSuccessMessage = "",
  initialErrorMessage = "",
}: CalendlyIntegrationSectionProps) {
  const calendly = useCalendlyIntegration({
    initialSuccessMessage,
    initialErrorMessage,
  });
  const { connection, loading } = calendly;
  const isBusy = calendly.saving || calendly.disconnecting;

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void calendly.saveSchedulingUrl();
  };

  return (
    <div className="space-y-3">
      {calendly.successMessage ? (
        <SettingsNotice tone="success">
          {calendly.successMessage}
        </SettingsNotice>
      ) : null}
      {calendly.errorMessage ? (
        <SettingsNotice tone="error">{calendly.errorMessage}</SettingsNotice>
      ) : null}

      <SettingsSectionCard
        title="Calendly"
        description="Booked calls show up in Calendar and on the lead, and you can send your scheduling link straight from a conversation."
      >
        <div
          className={`${SETTINGS_BLOCK_CLASS} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}
          aria-busy={loading}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]"
            >
              <CalendarDays size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-medium text-[#101011]">
                Calendly
              </p>
              {loading ? (
                <span className="mt-1 block h-3 w-28 animate-pulse rounded-full bg-[#F0F2F6]" />
              ) : (
                <p className="text-xs text-[#9A9CA2]">
                  {connection.connected
                    ? formatConnectedSince(connection.connectedAt)
                    : "Not connected"}
                </p>
              )}
            </div>
          </div>

          {loading ? null : connection.connected ? (
            <button
              type="button"
              onClick={() => void calendly.disconnect()}
              disabled={isBusy}
              className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 sm:w-auto [@media(hover:hover)]:enabled:hover:bg-red-50 [@media(hover:hover)]:enabled:hover:text-red-600"
            >
              {calendly.disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            // A plain link: connecting leaves the app for Calendly.
            <a
              href="/api/auth/calendly/login"
              className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              Connect Calendly
            </a>
          )}
        </div>

        {!loading && connection.connected ? (
          <form
            onSubmit={handleSave}
            className={`${SETTINGS_BLOCK_CLASS} border-t border-[#F0F2F6]`}
          >
            <label
              htmlFor="calendly-scheduling-url"
              className={SETTINGS_LABEL_CLASS}
            >
              Scheduling link
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="calendly-scheduling-url"
                name="calendly-scheduling-url"
                type="url"
                inputMode="url"
                value={calendly.schedulingUrlDraft}
                onChange={(event) =>
                  calendly.setSchedulingUrlDraft(event.target.value)
                }
                placeholder="https://calendly.com/your-handle/your-event"
                className={`${SETTINGS_INPUT_CLASS} sm:flex-1`}
              />
              <button
                type="submit"
                disabled={isBusy}
                className={`${SETTINGS_PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
              >
                {calendly.saving ? "Saving…" : "Save"}
              </button>
            </div>
            <p className={SETTINGS_HINT_CLASS}>
              This is the link sent to a lead when you share your calendar.
            </p>
          </form>
        ) : null}
      </SettingsSectionCard>
    </div>
  );
}
