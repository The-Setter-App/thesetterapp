"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { resetCache } from "@/lib/cache";

const TESTIMONIALS = [
  {
    src: "/images/testimonial.png",
    position: "left-[4%] top-[24%] -rotate-12",
  },
  {
    src: "/images/testimonial-2.png",
    position: "right-[6%] top-[25%] rotate-9",
  },
  {
    src: "/images/testimonial-3.png",
    position: "left-[7%] bottom-[24%] -rotate-8",
  },
  {
    src: "/images/testimonial-4.png",
    position: "right-[4%] bottom-[22%] rotate-6",
  },
];

function CloudBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/login-clouds.jpg')" }}
    />
  );
}

function BrandPanel() {
  return (
    <div className="relative z-10 hidden flex-1 items-center justify-center self-stretch lg:flex">
      <div className="pointer-events-none absolute inset-0">
        {TESTIMONIALS.map((testimonial) => (
          <div
            key={testimonial.src}
            className={`drift-card absolute hidden w-60 xl:block 2xl:w-80 ${testimonial.position}`}
          >
            <AppImage
              src={testimonial.src}
              alt=""
              width={900}
              height={342}
              className="w-full rounded-2xl border border-white/70 shadow-lg"
            />
          </div>
        ))}
      </div>

      <div className="relative max-w-xl px-8 text-center">
        <h2 className="text-4xl font-black leading-tight text-balance text-[#101011]">
          Join teams turning followers into customers
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#3f3d47]">
          A clearer inbox, a more accountable team, and a complete view from
          first DM to revenue.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sendCooldownSeconds, setSendCooldownSeconds] = useState(0);
  const router = useRouter();

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return "Something went wrong";
  };

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

  const parseResponseError = async (res: Response, fallback: string) => {
    try {
      const data = (await res.json()) as { error?: string };
      return data.error || fallback;
    } catch {
      return fallback;
    }
  };

  const parseResponseJsonSafe = async <T,>(
    res: Response,
  ): Promise<T | null> => {
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  };

  const formatCooldown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins <= 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
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
          const retryAfter = Number.parseInt(
            res.headers.get("Retry-After") || "60",
            10,
          );
          const cooldown =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
          setSendCooldownSeconds(cooldown);
          throw new Error(
            `Too many attempts. Try again in ${formatCooldown(cooldown)}.`,
          );
        }
        throw new Error(await parseResponseError(res, "Failed to send OTP"));
      }

      setStep("otp");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await parseResponseJsonSafe<{
        error?: string;
        requiresOnboarding?: boolean;
      }>(res);
      if (!res.ok) {
        if (res.status === 429) {
          const retryAfter = Number.parseInt(
            res.headers.get("Retry-After") || "60",
            10,
          );
          const cooldown =
            Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
          throw new Error(
            `Too many verification attempts. Try again in ${formatCooldown(cooldown)}.`,
          );
        }
        throw new Error(data?.error || "Invalid OTP");
      }

      // Successful login
      try {
        await resetCache();
      } catch (e) {
        console.error("Failed to reset cache on login:", e);
      }

      router.push(data?.requiresOnboarding ? "/onboarding" : "/dashboard");
      router.refresh(); // Refresh to update server components with new session
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex h-[100dvh] w-full items-center overflow-hidden font-sans"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <CloudBackground />

      <BrandPanel />

      <div className="relative z-10 flex w-full items-center justify-center p-4 lg:flex-1 lg:p-10">
        <div
          className="glass-panel flex min-h-[clamp(560px,78dvh,1000px)] w-full max-w-4xl flex-col items-center justify-center rounded-[40px] px-12 py-16 sm:px-20"
          style={{
            background: "rgba(255, 255, 255, 0.3)",
            backdropFilter: "blur(28px) saturate(160%)",
            WebkitBackdropFilter: "blur(28px) saturate(160%)",
            border: "1px solid rgba(255, 255, 255, 0.65)",
            boxShadow:
              "0 8px 32px rgba(76, 55, 158, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
          }}
        >
          <div className="flex w-full max-w-md flex-col items-center">
            <AppImage
              src="/images/setter-header.png"
              alt="Setter"
              className="mb-12 h-auto w-32"
              loadingMode="eager"
            />

            <h1 className="text-center text-4xl font-black text-[#101011]">
              {step === "email" ? "Let's get started" : "Check your inbox"}
            </h1>
            <p className="mt-3 text-center text-base font-bold text-[#606266]">
              {step === "email"
                ? "Enter your email to join Setter — whether you're new or returning, we'll get you in fast."
                : `We sent a code to ${email}. Enter it below to verify.`}
            </p>

            {error && (
              <div className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            {step === "email" ? (
              <form
                onSubmit={handleSendOTP}
                className="mt-8 flex w-full flex-col items-center"
              >
                <div className="flex h-16 w-full items-center rounded-full border border-white/70 bg-white pl-6 pr-2 shadow-sm focus-within:border-[#8771FF]">
                  <input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    className="h-11 flex-1 border-none bg-transparent text-base text-[#101011] outline-none placeholder:text-[#9A9CA2]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    className={`h-12 shrink-0 rounded-full px-6 text-base font-semibold transition-colors ${
                      email && !loading
                        ? "bg-[#8771FF] text-white hover:bg-[#6d5ed6]"
                        : "cursor-not-allowed bg-[#F0F2F6] text-[#9A9CA2]"
                    }`}
                    disabled={!email || loading || sendCooldownSeconds > 0}
                  >
                    {loading
                      ? "Sending…"
                      : sendCooldownSeconds > 0
                        ? `Wait ${formatCooldown(sendCooldownSeconds)}`
                        : "Continue"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleVerifyOTP}
                className="mt-8 flex w-full flex-col items-center"
              >
                <input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  className="h-16 w-full rounded-full border border-white/70 bg-white px-5 text-center text-xl tracking-[0.3em] text-[#101011] shadow-sm outline-none placeholder:tracking-normal placeholder:text-[#9A9CA2] focus:border-[#8771FF]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                />
                <button
                  type="submit"
                  className={`mt-4 h-12 w-full rounded-full text-base font-semibold transition-colors ${
                    otp.length >= 4 && !loading
                      ? "bg-[#8771FF] text-white hover:bg-[#6d5ed6]"
                      : "cursor-not-allowed bg-[#F0F2F6] text-[#9A9CA2]"
                  }`}
                  disabled={!otp || loading}
                >
                  {loading ? "Verifying…" : "Verify & log in"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="mt-3 text-sm text-[#3f3d47] hover:text-[#101011]"
                >
                  Change email
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-sm leading-relaxed text-[#4b4959]">
              By continuing, you agree to our{" "}
              <a
                href="https://thesetter.app/legal-pages/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#101011]"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="https://thesetter.app/legal-pages/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#101011]"
              >
                Privacy Policy
              </a>
              .
            </p>
            <p className="mt-1 text-center text-xs text-[#4b4959]">
              Your trial starts after signup without any payment.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(12px, -16px); }
        }
        .drift-card {
          animation: drift 7s ease-in-out infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .drift-card:nth-child(1) { animation-delay: 0s; }
        .drift-card:nth-child(2) { animation-delay: 1.6s; }
        .drift-card:nth-child(3) { animation-delay: 3.2s; }
        .drift-card:nth-child(4) { animation-delay: 4.8s; }
        @media (prefers-reduced-motion: reduce) {
          .drift-card { animation: none; }
        }
      `}</style>
    </div>
  );
}
