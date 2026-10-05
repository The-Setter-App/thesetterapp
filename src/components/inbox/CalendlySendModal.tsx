"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import ModalShell from "@/components/ui/ModalShell";

interface CalendlySendModalProps {
  open: boolean;
  conversationId: string;
  calendlyConnected: boolean;
  canManageCalendlyIntegration: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function CalendlySendModal({
  open,
  conversationId,
  calendlyConnected,
  canManageCalendlyIntegration,
  onClose,
  onSent,
}: CalendlySendModalProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("");
  const [defaultMessage, setDefaultMessage] = useState("");
  const [optionalMessage, setOptionalMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (!calendlyConnected) {
      setLoading(false);
      setBookingUrl("");
      setDefaultMessage("");
      setOptionalMessage("");
      setError("");
      return;
    }
    let active = true;
    setError("");
    setOptionalMessage("");
    setLoading(true);

    (async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversationId)}/calendly-link`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          bookingUrl?: string;
          defaultMessage?: string;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to prepare Calendly link.");
        }
        if (!active) return;
        setBookingUrl(data.bookingUrl || "");
        setDefaultMessage(data.defaultMessage || "");
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to prepare Calendly link.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, conversationId, calendlyConnected]);

  const finalMessage = useMemo(() => {
    const optional = optionalMessage.trim();
    if (!optional) return defaultMessage;
    return `${optional}\n\n${defaultMessage}`;
  }, [defaultMessage, optionalMessage]);

  const canSend =
    calendlyConnected && !loading && !sending && finalMessage.trim().length > 0;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/inbox/conversations/${encodeURIComponent(conversationId)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: finalMessage }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to send Calendly message.");
      }
      onSent?.();
      onClose();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send Calendly message.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  const fieldLabelClass = "mb-1.5 block text-sm font-semibold text-[#101011]";

  return (
    <ModalShell
      title="Send Calendly link"
      description="Add an optional note before sending your booking link."
      onClose={onClose}
      maxWidthClassName="md:max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          {!calendlyConnected && canManageCalendlyIntegration ? (
            <a
              href="/settings/integration"
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#8771FF] px-5 text-sm font-semibold text-white transition-[transform,background-color] duration-100 ease-out active:scale-[0.97] md:w-auto [@media(hover:hover)]:hover:bg-[#6d5ed6]"
            >
              Open Integration Settings
            </a>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-full md:w-auto"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="w-full rounded-full md:w-auto"
            onClick={handleSend}
            disabled={!canSend || !calendlyConnected}
          >
            {sending ? "Sending..." : "Send link"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!calendlyConnected ? (
          <div className="rounded-2xl bg-[#F8F7FF] px-4 py-3 text-sm text-[#606266]">
            {canManageCalendlyIntegration
              ? "Calendly is not connected yet. Connect it first to send booking links."
              : "Calendly is not connected yet. Ask your team owner to set up Calendly in Settings > Integration."}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <div className={calendlyConnected ? "" : "opacity-60"}>
          <p className={fieldLabelClass}>Booking link</p>
          <div className="break-all rounded-2xl bg-[#F8F7FF] px-4 py-3 text-[0.8125rem] text-[#101011]">
            {loading ? "Preparing link..." : bookingUrl || "No link available"}
          </div>
        </div>

        <div className={calendlyConnected ? "" : "opacity-60"}>
          <label
            htmlFor="calendly-optional-message"
            className={fieldLabelClass}
          >
            Optional message
          </label>
          <textarea
            id="calendly-optional-message"
            value={optionalMessage}
            onChange={(event) => setOptionalMessage(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-[#F0F2F6] bg-white px-4 py-3 text-[0.9375rem] text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:outline-none focus:ring-0"
            placeholder="Quick note before the booking link (optional)"
            disabled={!calendlyConnected}
          />
        </div>
      </div>
    </ModalShell>
  );
}
