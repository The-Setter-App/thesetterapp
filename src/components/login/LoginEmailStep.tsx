import type { FormEvent } from "react";
import { AppImage } from "@/components/ui/AppImage";
import EmailPillField from "@/components/ui/EmailPillField";
import { formatCooldown } from "./formatCooldown";

const ERROR_ID = "login-email-error";

interface LoginEmailStepProps {
  email: string;
  loading: boolean;
  error: string;
  sendCooldownSeconds: number;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
}

function getButtonLabel(loading: boolean, cooldownSeconds: number): string {
  if (loading) return "Checking…";
  if (cooldownSeconds > 0) return `Wait ${formatCooldown(cooldownSeconds)}`;
  return "Continue";
}

export default function LoginEmailStep({
  email,
  loading,
  error,
  sendCooldownSeconds,
  onEmailChange,
  onSubmit,
}: LoginEmailStepProps) {
  const hasError = error.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <>
      <AppImage
        src="/images/setter-wordmark.png"
        alt="Setter"
        width={640}
        height={130}
        className="h-auto w-28"
        loadingMode="eager"
      />

      <h1 className="mt-8 text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011] md:text-[2.5rem]">
        Let's get started
      </h1>
      <p className="mt-3 max-w-xs text-balance text-[1.0625rem] leading-[1.45] text-[#606266]">
        Enter your email to sign in or create your account.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 w-full">
        <EmailPillField
          id="email"
          label="Email address"
          buttonLabel={getButtonLabel(loading, sendCooldownSeconds)}
          buttonDisabled={!email || loading || sendCooldownSeconds > 0}
          hasError={hasError}
          inputProps={{
            value: email,
            required: true,
            disabled: loading,
            enterKeyHint: "next",
            "aria-invalid": hasError,
            "aria-describedby": hasError ? ERROR_ID : undefined,
            onChange: (event) => onEmailChange(event.target.value),
          }}
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
      </form>
    </>
  );
}
