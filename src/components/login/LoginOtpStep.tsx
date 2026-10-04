import { type FormEvent, useEffect, useRef } from "react";
import { LuMailCheck } from "react-icons/lu";
import { formatCooldown } from "./formatCooldown";

const ERROR_ID = "login-otp-error";
const OTP_LENGTH = 6;

const TEXT_BUTTON_CLASS =
  "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-[#8771FF] transition-[transform,color] duration-100 ease-out active:scale-[0.97] disabled:text-[#9A9CA2] disabled:active:scale-100 [@media(hover:hover)]:enabled:hover:text-[#6d5ed6]";

interface LoginOtpStepProps {
  email: string;
  otp: string;
  loading: boolean;
  error: string;
  sendCooldownSeconds: number;
  onOtpChange: (otp: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
}

// Codes are always digits, so anything else (a pasted space or dash) is
// dropped instead of counting against the length.
function sanitizeOtp(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export default function LoginOtpStep({
  email,
  otp,
  loading,
  error,
  sendCooldownSeconds,
  onOtpChange,
  onSubmit,
  onResend,
  onBack,
}: LoginOtpStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasError = error.length > 0;

  // The step replaces the email form, and the field is disabled during each
  // request (which drops focus), so put focus back on the code field whenever
  // it becomes usable.
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
        <LuMailCheck className="h-7 w-7" aria-hidden="true" />
      </span>

      <h1 className="mt-6 text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011] md:text-[2.5rem]">
        Check your email
      </h1>
      <p className="mt-3 max-w-xs text-pretty text-[1.0625rem] leading-[1.45] text-[#606266]">
        Enter the 6-digit code we sent to{" "}
        {/* Kept in one piece: it moves to its own line and only breaks when it
            is wider than the column. */}
        <span className="inline-block max-w-full font-medium text-[#101011] [overflow-wrap:anywhere]">
          {email}
        </span>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full">
        <label htmlFor="otp" className="sr-only">
          Verification code
        </label>
        {/* Extra left padding offsets the trailing letter spacing so the
            digits sit optically centred. */}
        <input
          ref={inputRef}
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={otp}
          onChange={(event) => onOtpChange(sanitizeOtp(event.target.value))}
          required
          disabled={loading}
          aria-invalid={hasError}
          aria-describedby={hasError ? ERROR_ID : undefined}
          className={`h-14 w-full rounded-full border bg-white pl-[calc(1.25rem+0.3em)] pr-5 text-center text-2xl font-medium tabular-nums tracking-[0.3em] text-[#101011] shadow-sm outline-none transition-colors duration-150 placeholder:font-normal placeholder:text-[#9A9CA2] disabled:opacity-60 ${
            hasError
              ? "border-red-300"
              : "border-[#F0F2F6] focus:border-[#8771FF]"
          }`}
        />

        {hasError && (
          <p
            id={ERROR_ID}
            role="alert"
            className="mt-3 text-sm font-medium text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={otp.length < OTP_LENGTH || loading}
          className="mt-3 h-[3.25rem] w-full rounded-full bg-[#8771FF] px-6 text-[1.0625rem] font-semibold text-white transition-[transform,background-color,opacity] duration-100 ease-out active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]"
        >
          {loading ? "Verifying…" : "Verify & log in"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1">
        <button
          type="button"
          onClick={onResend}
          disabled={loading || sendCooldownSeconds > 0}
          className={TEXT_BUTTON_CLASS}
        >
          {sendCooldownSeconds > 0
            ? `Resend in ${formatCooldown(sendCooldownSeconds)}`
            : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className={TEXT_BUTTON_CLASS}
        >
          Use a different email
        </button>
      </div>
    </>
  );
}
