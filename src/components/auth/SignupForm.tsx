import type React from "react";
import { AuthInput, AuthPrimaryButton, AuthTextButton } from "@/components/auth/AuthPanel";

interface SignupFormProps {
  step: "accessCode" | "email" | "otp";
  accessCode: string;
  email: string;
  otp: string;
  loading: boolean;
  onAccessCodeChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onAccessCodeContinue: (e: React.FormEvent) => void;
  onSendOtp: (e: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onBackToEmail: () => void;
}

export default function SignupForm({
  step,
  accessCode,
  email,
  otp,
  loading,
  onAccessCodeChange,
  onEmailChange,
  onOtpChange,
  onAccessCodeContinue,
  onSendOtp,
  onVerifyOtp,
  onBackToEmail,
}: SignupFormProps) {
  if (step === "accessCode") {
    return (
      <form onSubmit={onAccessCodeContinue} className="space-y-1">
        <AuthInput
          label="Access Code"
          id="signup-access-code"
          type="password"
          value={accessCode}
          onChange={(e) => onAccessCodeChange(e.target.value)}
          placeholder="Enter owner access code"
          disabled={loading}
          required
        />
        <AuthPrimaryButton
          type="submit"
          disabled={!accessCode.trim() || loading}
          isActive={Boolean(accessCode.trim()) && !loading}
        >
          Continue
        </AuthPrimaryButton>
        <p className="pt-1 text-xs text-[#7A7D85]">
          Owner signup needs a valid access code. If you are a setter or closer, ask your owner for an invite.
        </p>
      </form>
    );
  }

  if (step === "email") {
    return (
      <form onSubmit={onSendOtp} className="space-y-1">
        <AuthInput
          label="Enter your email"
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="name@gmail.com"
          disabled={loading}
          required
        />
        <AuthPrimaryButton type="submit" disabled={!email || loading} isActive={Boolean(email) && !loading}>
          {loading ? "Sending code..." : "Send OTP"}
        </AuthPrimaryButton>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyOtp} className="space-y-1">
      <AuthInput
        label="OTP Code"
        id="signup-otp"
        type="text"
        value={otp}
        onChange={(e) => onOtpChange(e.target.value)}
        placeholder="123456"
        disabled={loading}
        maxLength={6}
        required
        className="text-center text-base tracking-[0.35em]"
      />
      <AuthPrimaryButton type="submit" disabled={!otp || loading} isActive={Boolean(otp) && !loading}>
        {loading ? "Verifying..." : "Verify & Create Account"}
      </AuthPrimaryButton>
      <AuthTextButton className="mx-auto block pt-1 text-center" disabled={loading} onClick={onBackToEmail}>
        Change email
      </AuthTextButton>
    </form>
  );
}
