"use client";

import surface from "@/components/ui/brandSurface.module.css";
import LoginEmailStep from "./LoginEmailStep";
import LoginLegal from "./LoginLegal";
import LoginOtpStep from "./LoginOtpStep";
import { useOtpLogin } from "./useOtpLogin";

export default function LoginPanel() {
  const {
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
  } = useOtpLogin();

  return (
    // Extra bottom padding on phones lifts the block to the optical centre,
    // which sits a little above the geometric one. Beside the brand tile the
    // glow is narrowed so it fades out before the column's edges.
    <section
      className={`${surface.glow} flex flex-1 items-center justify-center px-4 pb-[clamp(1.5rem,8svh,4rem)] pt-10 md:px-6 lg:px-8 lg:py-10 lg:[--glow-width:62%]`}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* Keyed by step so each one materializes in when it replaces the
            other. */}
        <div
          key={step}
          className={`${surface.materialize} flex w-full flex-col items-center`}
        >
          {step === "email" ? (
            <LoginEmailStep
              email={email}
              loading={loading}
              error={error}
              sendCooldownSeconds={sendCooldownSeconds}
              onEmailChange={setEmail}
              onSubmit={() => void sendOtp()}
            />
          ) : (
            <LoginOtpStep
              email={email}
              otp={otp}
              loading={loading}
              error={error}
              sendCooldownSeconds={sendCooldownSeconds}
              onOtpChange={setOtp}
              onSubmit={() => void verifyOtp()}
              onResend={() => void sendOtp()}
              onBack={backToEmail}
            />
          )}
        </div>

        <LoginLegal />
      </div>
    </section>
  );
}
