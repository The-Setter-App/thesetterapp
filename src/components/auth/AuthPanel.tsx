import type React from "react";

interface AuthPanelProps {
  mode: "login" | "signup";
  loading: boolean;
  title: string;
  description: string;
  error: string;
  onModeChange: (mode: "login" | "signup") => void;
  children: React.ReactNode;
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

interface AuthPrimaryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive: boolean;
}

export function AuthPanel({
  mode,
  loading,
  title,
  description,
  error,
  onModeChange,
  children,
}: AuthPanelProps) {
  return (
    <div
      className="relative h-dvh overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #ECEAF8 0%, #DAD6F2 48%, #EDEBF8 100%)",
      }}
    >
      <div className="absolute inset-x-0 top-4 z-10 px-6 md:top-6">
        <div className="mx-auto flex w-full max-w-[520px] items-center justify-between text-xs font-semibold text-[#101011]">
          <div className="flex items-center gap-2 opacity-80">
            <img
              src="/favicon.svg"
              alt="Setter favicon"
              width={16}
              height={16}
              className="h-4 w-4"
            />
            <p>setter</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onModeChange("login")}
              className={`h-8 px-4 text-sm font-semibold transition ${
                mode === "login"
                  ? "text-[#101011]"
                  : "text-[#606266] hover:text-[#101011]"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onModeChange("signup")}
              className={`h-8 px-4 text-sm font-semibold transition ${
                mode === "signup"
                  ? "text-[#101011]"
                  : "text-[#606266] hover:text-[#101011]"
              }`}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-[640px] items-center justify-center px-6 pb-8 pt-16">
        <div className="grid min-h-[492px] w-full max-w-[520px] grid-rows-[auto_auto_auto_auto_auto] px-2 py-2">
          <div className="mb-2 flex justify-center">
            <img
              src="/images/login-icon.png"
              alt="Login Logo"
              width={90}
              height={90}
            />
          </div>

          <div className="min-h-[94px] text-center">
            <h2 className="text-[30px] font-bold tracking-tight text-[#101011] md:text-[34px]">
              {title}
            </h2>
            <p className="mx-auto mt-2 max-w-[480px] text-[14px] font-semibold leading-6 text-[#22324C] md:text-[15px]">
              {description}
            </p>
          </div>

          <div className="mx-auto mt-1 min-h-[56px] w-full max-w-[440px]">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mx-auto mt-1 min-h-[196px] w-full max-w-[440px]">
            {children}
          </div>

          <p className="mx-auto mt-1 max-w-[440px] text-center text-[14px] text-[#596783]">
            Continue to accept{" "}
            <a
              href="/terms"
              className="underline decoration-[#9FA8BD] underline-offset-2 hover:text-[#526892]"
            >
              terms & conditions
            </a>
            {" and "}
            <a
              href="/privacy-policy"
              className="underline decoration-[#9FA8BD] underline-offset-2 hover:text-[#526892]"
            >
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export function AuthInput({ label, className = "", ...props }: AuthInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-bold text-[#0E2342]">
        {label}
      </span>
      <input
        className={`h-12 w-full rounded-lg border border-[#CFD6E2] bg-[#FBFCFF] px-4 text-[16px] font-medium text-[#101011] placeholder:text-[#8F97A8] transition focus:border-[#A5B1C8] focus:outline-none ${className}`}
        {...props}
      />
    </label>
  );
}

export function AuthPrimaryButton({
  isActive,
  className = "",
  disabled,
  children,
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`mt-4 h-12 w-full rounded-lg border border-[#CFD6E2] text-[18px] font-medium leading-none transition ${
        isActive
          ? "bg-[#8771FF] text-white hover:bg-[#6d5ed6]"
          : "bg-[#E9EAEE] text-[#9298A3]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function AuthTextButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`mt-3 text-sm font-medium text-[#606266] transition hover:text-[#101011] ${className}`}
    >
      {children}
    </button>
  );
}
