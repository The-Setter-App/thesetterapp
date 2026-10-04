"use client";

import type { FormEvent } from "react";
import EmailPillField from "@/components/ui/EmailPillField";
import SetterScoop from "@/components/ui/SetterScoop";
import { useWaitlistSignup } from "./useWaitlistSignup";
import WaitlistConfirmation from "./WaitlistConfirmation";

const ERROR_ID = "waitlist-email-error";
const NOTE_ID = "waitlist-email-note";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export default function WaitlistForm() {
  const { status, errorMessage, joinedEmail, clearError, submit } =
    useWaitlistSignup();
  const isSubmitting = status === "submitting";
  const hasError = errorMessage.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submit({
      email: readField(formData, "email"),
      company: readField(formData, "company"),
    });
  };

  return (
    // The live region stays mounted across both states so the confirmation
    // and any error are announced when they appear.
    <div aria-live="polite" className="min-h-[10rem] w-full">
      {status === "joined" ? (
        <WaitlistConfirmation email={joinedEmail} />
      ) : (
        <form onSubmit={handleSubmit} noValidate className="w-full">
          <div className="relative">
            {/* Offset so the scoop's base lines up with the field's top edge
                and only its drips hang over the field. */}
            <SetterScoop className="pointer-events-none absolute -top-[2.3rem] left-6 z-10 h-auto w-[5.25rem]" />
            <EmailPillField
              id="waitlist-email"
              label="Email address"
              buttonLabel={isSubmitting ? "Joining…" : "Join the waitlist"}
              buttonDisabled={isSubmitting}
              hasError={hasError}
              inputProps={{
                name: "email",
                enterKeyHint: "send",
                disabled: isSubmitting,
                "aria-invalid": hasError,
                "aria-describedby": hasError ? ERROR_ID : NOTE_ID,
                onChange: hasError ? clearError : undefined,
              }}
            />
          </div>

          {/* Hidden from people and assistive tech; only bots fill it in. */}
          <div aria-hidden="true" className="hidden">
            <label htmlFor="waitlist-company">Company</label>
            <input
              id="waitlist-company"
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {hasError ? (
            <p
              id={ERROR_ID}
              role="alert"
              className="mt-3 text-sm font-medium text-red-700"
            >
              {errorMessage}
            </p>
          ) : (
            <p
              id={NOTE_ID}
              className="mt-3 text-[0.8125rem] text-[#606266] sm:text-sm"
            >
              No spam. One email when your spot opens.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
