"use client";

import { useCallback, useState } from "react";
import {
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_SECONDARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import ModalShell from "@/components/ui/ModalShell";

const CONFIRM_WORD = "DISCONNECT";

const DANGER_BUTTON_CLASS =
  "inline-flex h-11 w-full items-center justify-center rounded-full bg-red-600 px-5 text-sm font-semibold text-white outline-none transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 md:w-auto [@media(hover:hover)]:enabled:hover:bg-red-700";

interface DisconnectAccountButtonProps {
  accountId: string;
  accountLabel?: string;
}

export default function DisconnectAccountButton({
  accountId,
  accountLabel,
}: DisconnectAccountButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canDisconnect =
    confirmText.trim().toUpperCase() === CONFIRM_WORD && !submitting;
  const action = `/api/auth/instagram/accounts/${encodeURIComponent(accountId)}`;
  const formId = `disconnect-${accountId}`;

  const close = useCallback(() => {
    // Once the request is on its way the dialog stays until the page reloads.
    if (submitting) return;
    setOpen(false);
    setConfirmText("");
  }, [submitting]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold text-[#606266] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-600"
      >
        Disconnect
      </button>

      {open ? (
        <ModalShell
          title="Disconnect account"
          description={`${accountLabel ?? "This account"} will stop syncing and its conversations will be removed from the inbox.`}
          onClose={close}
          footer={
            <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
              <button
                type="button"
                onClick={close}
                className={`${SETTINGS_SECONDARY_BUTTON_CLASS} w-full md:w-auto`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                disabled={!canDisconnect}
                className={DANGER_BUTTON_CLASS}
              >
                {submitting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          }
        >
          <form
            id={formId}
            action={action}
            method="post"
            onSubmit={(event) => {
              if (!canDisconnect) {
                event.preventDefault();
                return;
              }
              setSubmitting(true);
            }}
          >
            <label
              htmlFor={`${formId}-confirm`}
              className={SETTINGS_LABEL_CLASS}
            >
              Type {CONFIRM_WORD} to confirm
            </label>
            <input
              id={`${formId}-confirm`}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
              autoCapitalize="characters"
              className={SETTINGS_INPUT_CLASS}
            />
          </form>
        </ModalShell>
      ) : null}
    </>
  );
}
