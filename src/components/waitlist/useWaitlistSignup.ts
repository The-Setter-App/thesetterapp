"use client";

import { useCallback, useState } from "react";
import { normalizeWaitlistEmail } from "@/lib/waitlist/validation";

export type WaitlistSignupStatus = "idle" | "submitting" | "joined";

export interface WaitlistSubmission {
  email: string;
  // Honeypot value, forwarded untouched so the server can discard bots.
  company: string;
}

export interface UseWaitlistSignupResult {
  status: WaitlistSignupStatus;
  errorMessage: string;
  joinedEmail: string;
  clearError: () => void;
  submit: (submission: WaitlistSubmission) => Promise<void>;
}

const INVALID_EMAIL_MESSAGE = "Enter a valid email address.";
const NETWORK_ERROR_MESSAGE =
  "Couldn't reach Setter. Check your connection and try again.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { error } = payload as { error?: unknown };
  return typeof error === "string" && error ? error : null;
}

export function useWaitlistSignup(): UseWaitlistSignupResult {
  const [status, setStatus] = useState<WaitlistSignupStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [joinedEmail, setJoinedEmail] = useState("");

  const clearError = useCallback(() => setErrorMessage(""), []);

  const submit = useCallback(
    async (submission: WaitlistSubmission) => {
      if (status !== "idle") return;

      const email = normalizeWaitlistEmail(submission.email);
      if (!email) {
        setErrorMessage(INVALID_EMAIL_MESSAGE);
        return;
      }

      setStatus("submitting");
      setErrorMessage("");

      let response: Response;
      try {
        response = await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, company: submission.company }),
        });
      } catch {
        setErrorMessage(NETWORK_ERROR_MESSAGE);
        setStatus("idle");
        return;
      }

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setErrorMessage(readErrorMessage(payload) ?? GENERIC_ERROR_MESSAGE);
        setStatus("idle");
        return;
      }

      setJoinedEmail(email);
      setStatus("joined");
    },
    [status],
  );

  return { status, errorMessage, joinedEmail, clearError, submit };
}
