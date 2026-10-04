"use client";

import type { FormEvent } from "react";
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
          <div
            className={`flex flex-col gap-2.5 transition-colors duration-150 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:border sm:bg-white sm:p-1.5 sm:pl-6 sm:shadow-sm ${
              hasError
                ? "sm:border-red-300"
                : "sm:border-[#F0F2F6] sm:focus-within:border-[#8771FF]"
            }`}
          >
            <label htmlFor="waitlist-email" className="sr-only">
              Email address
            </label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              placeholder="you@company.com"
              disabled={isSubmitting}
              aria-invalid={hasError}
              aria-describedby={hasError ? ERROR_ID : NOTE_ID}
              onChange={hasError ? clearError : undefined}
              className={`h-[3.25rem] w-full min-w-0 rounded-full border bg-white px-5 text-[1.0625rem] text-[#101011] shadow-sm sm:text-base outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] disabled:opacity-60 sm:h-11 sm:flex-1 sm:border-0 sm:bg-transparent sm:px-0 sm:shadow-none ${
                hasError
                  ? "border-red-300"
                  : "border-[#F0F2F6] focus:border-[#8771FF]"
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[3.25rem] w-full shrink-0 rounded-full bg-[#8771FF] px-6 text-[1.0625rem] font-semibold text-white sm:text-base sm:font-medium transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-70 sm:h-11 sm:w-auto sm:min-w-[10rem] [@media(hover:hover)]:hover:bg-[#6d5ed6]"
            >
              {isSubmitting ? "Joining…" : "Join the waitlist"}
            </button>
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
