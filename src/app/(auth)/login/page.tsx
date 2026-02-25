"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPanel } from "@/components/auth/AuthPanel";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { resetCache } from "@/lib/clientCache";

type AuthMode = "login" | "signup";
type LoginStep = "email" | "otp";
type SignupStep = "accessCode" | "email" | "otp";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginStep, setLoginStep] = useState<LoginStep>("email");
  const [signupStep, setSignupStep] = useState<SignupStep>("accessCode");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    return "Something went wrong";
  };

  const resetAuthForm = (nextMode?: AuthMode) => {
    if (nextMode) setMode(nextMode);
    setLoginStep("email");
    setSignupStep("accessCode");
    setEmail("");
    setOtp("");
    setAccessCode("");
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    resetCache().catch(console.error);
  }, []);

  const handleLoginSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to send OTP");
      }

      setLoginStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Invalid OTP");
      }

      try {
        await resetCache();
      } catch (cacheError) {
        console.error("Failed to reset cache on login:", cacheError);
      }

      router.push(Boolean(data?.requiresOnboarding) ? "/onboarding" : "/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupAccessCodeContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accessCode.trim()) {
      setError("Access code is required");
      return;
    }
    setSignupStep("email");
  };

  const handleSignupSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, accessCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Failed to send OTP");
      }

      setSignupStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, accessCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Invalid OTP");
      }

      try {
        await resetCache();
      } catch (cacheError) {
        console.error("Failed to reset cache on signup:", cacheError);
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === "login"
      ? loginStep === "email"
        ? "Let's Get Started"
        : "Check Your Inbox"
      : signupStep === "accessCode"
        ? "Owner Access"
        : signupStep === "email"
          ? "Create Owner Account"
          : "Check Your Inbox";

  const description =
    mode === "login"
      ? loginStep === "email"
        ? "Enter your email to join Setter - whether you're new or returning, we'll get you in fast."
        : `We sent a code to ${email}. Enter it below to verify.`
      : signupStep === "accessCode"
        ? "Enter your owner access code first before signing up."
        : signupStep === "email"
          ? "Enter your owner email and we'll send a one-time code."
          : `We sent a code to ${email}. Enter it below to verify.`;

  return (
    <AuthPanel
      mode={mode}
      loading={loading}
      title={title}
      description={description}
      error={error}
      onModeChange={(nextMode) => resetAuthForm(nextMode)}
    >
      {mode === "login" ? (
        <LoginForm
          step={loginStep}
          email={email}
          otp={otp}
          loading={loading}
          onEmailChange={setEmail}
          onOtpChange={setOtp}
          onSendOtp={handleLoginSendOTP}
          onVerifyOtp={handleLoginVerifyOTP}
          onBackToEmail={() => {
            setLoginStep("email");
            setOtp("");
            setError("");
          }}
        />
      ) : (
        <SignupForm
          step={signupStep}
          accessCode={accessCode}
          email={email}
          otp={otp}
          loading={loading}
          onAccessCodeChange={setAccessCode}
          onEmailChange={setEmail}
          onOtpChange={setOtp}
          onAccessCodeContinue={handleSignupAccessCodeContinue}
          onSendOtp={handleSignupSendOTP}
          onVerifyOtp={handleSignupVerifyOTP}
          onBackToEmail={() => {
            setSignupStep("email");
            setOtp("");
            setError("");
          }}
        />
      )}
    </AuthPanel>
  );
}
