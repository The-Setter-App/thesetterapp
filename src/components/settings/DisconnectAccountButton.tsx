"use client";

import { useMemo, useState } from "react";
import { CircleAlert, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DisconnectAccountButton({
  accountId,
  accountLabel,
}: {
  accountId: string;
  accountLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalized = useMemo(() => confirmText.trim().toUpperCase(), [confirmText]);
  const canDisconnect = normalized === "DISCONNECT" && !submitting;
  const action = `/api/auth/instagram/accounts/${encodeURIComponent(accountId)}`;

  async function handleCopyDisconnectText() {
    try {
      await navigator.clipboard.writeText("DISCONNECT");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error("[DisconnectAccountButton] Failed to copy text:", error);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="bg-white w-full md:w-auto h-12"
        leftIcon={<Trash2 size={15} />}
        onClick={() => setOpen(true)}
      >
        Disconnect
      </Button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <CircleAlert size={18} />
                </div>
                <h3 className="text-base font-semibold text-stone-900">Disconnect Account</h3>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 focus:outline-none"
                onClick={() => {
                  if (submitting) return;
                  setOpen(false);
                  setConfirmText("");
                  setCopied(false);
                }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              action={action}
              method="post"
              onSubmit={(e) => {
                if (!canDisconnect) {
                  e.preventDefault();
                  return;
                }
                setSubmitting(true);
              }}
              className="space-y-4 px-5 py-5"
            >
              <p className="text-sm text-stone-700">
                This will disconnect
                {accountLabel ? ` ${accountLabel}` : " this account"} and remove its inbox chats.
              </p>
              <p className="text-sm text-stone-600">
                Type{" "}
                <button
                  type="button"
                  onClick={handleCopyDisconnectText}
                  className="rounded-full bg-stone-100 px-2 py-1 font-semibold text-stone-900 transition-colors hover:bg-stone-200 focus:outline-none"
                  title="Click to copy"
                >
                  DISCONNECT
                </button>{" "}
                to continue.
                {copied && <span className="ml-2 text-xs font-medium text-emerald-700">Copied</span>}
              </p>

              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DISCONNECT"
                className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
                autoComplete="off"
              />

              <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 w-full md:w-auto"
                  onClick={() => {
                    if (submitting) return;
                    setOpen(false);
                    setConfirmText("");
                    setCopied(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-12 w-full md:w-auto"
                  disabled={!canDisconnect}
                >
                  {submitting ? "Disconnecting..." : "Confirm Disconnect"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
