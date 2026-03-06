"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#F0F2F6] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[#101011]">
              Send Calendly Link
            </h3>
            <p className="mt-0.5 text-xs text-[#606266]">
              Add an optional note before sending your booking link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#606266] hover:bg-[#F8F7FF]"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {!calendlyConnected ? (
            <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-3 text-sm text-[#606266]">
              {canManageCalendlyIntegration
                ? "Calendly is not connected yet. Connect it first to send booking links."
                : "Calendly is not connected yet. Ask your team owner to set up Calendly in Settings > Integration."}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className={calendlyConnected ? "" : "opacity-60"}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#606266]">
              Booking Link
            </label>
            <div className="rounded-xl border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-2 text-xs text-[#101011] break-all">
              {loading ? "Preparing link..." : bookingUrl || "No link available"}
            </div>
          </div>

          <div className={calendlyConnected ? "" : "opacity-60"}>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#606266]">
              Optional Message
            </label>
            <textarea
              value={optionalMessage}
              onChange={(event) => setOptionalMessage(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#F0F2F6] bg-white px-3 py-2 text-sm text-[#101011] placeholder:text-[#9A9CA2] focus:outline-none"
              placeholder="Quick note before the booking link (optional)"
              disabled={!calendlyConnected}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#F0F2F6] px-5 py-4 md:flex-row md:justify-end">
          {!calendlyConnected && canManageCalendlyIntegration ? (
            <a
              href="/settings/integration"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#8771FF] px-4 text-sm font-semibold text-white hover:bg-[#6d5ed6] md:w-auto"
            >
              Open Integration Settings
            </a>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-full md:w-auto"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-12 w-full md:w-auto"
            onClick={handleSend}
            disabled={!canSend || !calendlyConnected}
          >
            {sending ? "Sending..." : "Send Link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
