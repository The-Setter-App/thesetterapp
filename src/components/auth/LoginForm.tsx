import type React from "react";
import { AuthInput, AuthPrimaryButton, AuthTextButton } from "@/components/auth/AuthPanel";

interface LoginFormProps {
  step: "email" | "otp";
  email: string;
  otp: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSendOtp: (e: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onBackToEmail: () => void;
}

export default function LoginForm({
  step,
  email,
  otp,
  loading,
  onEmailChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  onBackToEmail,
}: LoginFormProps) {
  if (step === "email") {
    return (
      <form onSubmit={onSendOtp} className="space-y-1">
        <AuthInput
          label="Enter your email"
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="name@gmail.com"
          disabled={loading}
          required
        />
        <AuthPrimaryButton type="submit" disabled={!email || loading} isActive={Boolean(email) && !loading}>
          {loading ? "Sending code..." : "Continue"}
        </AuthPrimaryButton>
        <p className="pt-1 text-xs text-[#7A7D85]">
          Not invited yet? Ask your owner to add you in Team Settings, or sign up as owner with access code.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={onVerifyOtp} className="space-y-1">
      <AuthInput
        label="OTP Code"
        id="login-otp"
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
        {loading ? "Verifying..." : "Verify & Login"}
      </AuthPrimaryButton>
      <AuthTextButton className="mx-auto block pt-1 text-center" disabled={loading} onClick={onBackToEmail}>
        Change email
      </AuthTextButton>
    </form>
  );
}
