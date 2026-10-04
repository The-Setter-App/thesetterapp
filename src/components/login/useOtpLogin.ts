"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { resetCache } from "@/lib/cache";
import { formatCooldown } from "./formatCooldown";

export type LoginStep = "email" | "otp";

export interface UseOtpLoginResult {
  step: LoginStep;
  email: string;
  otp: string;
  loading: boolean;
  error: string;
  sendCooldownSeconds: number;
  setEmail: (email: string) => void;
  setOtp: (otp: string) => void;
  sendOtp: () => Promise<void>;
  verifyOtp: () => Promise<void>;
  backToEmail: () => void;
}

interface AuthResponseBody {
  error: string | null;
  requiresOnboarding: boolean;
}

const DEFAULT_RETRY_SECONDS = 60;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// The auth routes answer with JSON, but a proxy or crash can return anything,
// so the body is read defensively and narrowed to the two fields used here.
async function readAuthResponse(res: Response): Promise<AuthResponseBody> {
  const payload: unknown = await res.json().catch(() => null);
  if (typeof payload !== "object" || payload === null) {
    return { error: null, requiresOnboarding: false };
  }

  const { error, requiresOnboarding } = payload as {
    error?: unknown;
    requiresOnboarding?: unknown;
  };
  return {
    error: typeof error === "string" && error ? error : null,
    requiresOnboarding: requiresOnboarding === true,
  };
}

function readRetryAfterSeconds(res: Response): number {
  const retryAfter = Number.parseInt(
    res.headers.get("Retry-After") || String(DEFAULT_RETRY_SECONDS),
    10,
  );
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter
    : DEFAULT_RETRY_SECONDS;
}

export function useOtpLogin(): UseOtpLoginResult {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginStep>("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendCooldownSeconds, setSendCooldownSeconds] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Clear cache on mount to ensure clean state
    resetCache().catch(console.error);
  }, []);

  useEffect(() => {
    if (sendCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setSendCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sendCooldownSeconds]);

  const sendOtp = useCallback(async () => {
    if (sendCooldownSeconds > 0) {
      setError(
        `Please wait ${formatCooldown(sendCooldownSeconds)} before retrying.`,
      );
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const cooldown = readRetryAfterSeconds(res);
          setSendCooldownSeconds(cooldown);
          throw new Error(
            `Too many attempts. Try again in ${formatCooldown(cooldown)}.`,
          );
        }
        const body = await readAuthResponse(res);
        throw new Error(body.error || "Failed to send OTP");
      }

      setStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email, sendCooldownSeconds]);

  const verifyOtp = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const body = await readAuthResponse(res);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(
            `Too many verification attempts. Try again in ${formatCooldown(readRetryAfterSeconds(res))}.`,
          );
        }
        throw new Error(body.error || "Invalid OTP");
      }

      // Successful login
      try {
        await resetCache();
      } catch (cacheError) {
        console.error("Failed to reset cache on login:", cacheError);
      }

      router.push(body.requiresOnboarding ? "/onboarding" : "/dashboard");
      router.refresh(); // Refresh to update server components with new session
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email, otp, router]);

  const backToEmail = useCallback(() => {
    setStep("email");
    setOtp("");
    setError("");
  }, []);

  return {
    step,
    email,
    otp,
    loading,
    error,
    sendCooldownSeconds,
    setEmail,
    setOtp,
    sendOtp,
    verifyOtp,
    backToEmail,
  };
}
