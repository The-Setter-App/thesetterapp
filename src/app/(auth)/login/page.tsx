"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LuBot,
  LuCalendarCheck2,
  LuDollarSign,
  LuInbox,
  LuTrendingUp,
  LuUsers,
} from "react-icons/lu";
import { AppImage } from "@/components/ui/AppImage";
import { resetCache } from "@/lib/cache";

interface SlideCard {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  caption: string;
}

interface Slide {
  headline: string;
  sub: string;
  cards: [SlideCard, SlideCard];
}

const SLIDES: Slide[] = [
  {
    headline: "Never lose a lead in the DMs again",
    sub: "One inbox for every Instagram conversation, organized by stage so your team always knows who to message next.",
    cards: [
      {
        icon: LuInbox,
        title: "Unified Inbox",
        caption: "Every account, one view",
      },
      {
        icon: LuUsers,
        title: "Team Roles",
        caption: "Setters, closers, owners",
      },
    ],
  },
  {
    headline: "An AI copilot for every reply",
    sub: "Setter AI reads the conversation and helps you write the next message, so replies go out faster instead of generic.",
    cards: [
      { icon: LuBot, title: "Setter AI", caption: "Draft replies instantly" },
      {
        icon: LuCalendarCheck2,
        title: "Booked Calls",
        caption: "Attributed to the setter",
      },
    ],
  },
  {
    headline: "See exactly what's driving revenue",
    sub: "A live funnel from first message to closed deal, so you know what's working and what isn't.",
    cards: [
      {
        icon: LuTrendingUp,
        title: "Revenue Funnel",
        caption: "New lead to Won",
      },
      {
        icon: LuDollarSign,
        title: "Live Dashboard",
        caption: "Real numbers, not guesses",
      },
    ],
  },
];

const SLIDE_INTERVAL_MS = 5000;

function CloudBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/login-clouds.jpg')" }}
    />
  );
}

function BrandPanel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 hidden flex-1 flex-col items-center justify-center lg:flex">
      <div className="flex w-full max-w-md flex-col items-center px-8">
        <div className="relative mb-8 h-40 w-full">
          {SLIDES[activeSlide].cards.map((card, i) => (
            <div
              key={card.title}
              className={`drift-card absolute w-44 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-lg backdrop-blur-sm ${
                i === 0 ? "left-0 top-0 -rotate-3" : "right-0 top-16 rotate-3"
              }`}
            >
              <card.icon className="mb-3 h-6 w-6 text-[#8771FF]" />
              <div className="text-sm font-bold text-[#101011]">
                {card.title}
              </div>
              <div className="mt-0.5 text-xs text-[#606266]">
                {card.caption}
              </div>
            </div>
          ))}
        </div>

        <div key={activeSlide} className="fade-in-up text-center">
          <h2 className="text-2xl font-extrabold leading-tight text-balance text-[#101011]">
            {SLIDES[activeSlide].headline}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#3f3d47]">
            {SLIDES[activeSlide].sub}
          </p>
        </div>

        <div className="mt-8 flex items-center gap-1.5">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.headline}
              type="button"
              onClick={() => setActiveSlide(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeSlide ? "w-6 bg-[#8771FF]" : "w-1.5 bg-white/70"
              }`}
            />
          ))}
        </div>
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
          className="glass-panel flex min-h-[640px] w-full max-w-4xl flex-col items-center justify-center rounded-[40px] px-12 py-20 sm:px-20"
          style={{
            background: "rgba(255, 255, 255, 0.55)",
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

            <h1 className="text-center text-3xl font-extrabold text-[#101011]">
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
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .drift-card { animation: drift 6s ease-in-out infinite; }
        .drift-card:nth-child(2) { animation-delay: 1.2s; }
        .fade-in-up { animation: fade-in-up 0.5s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .drift-card, .fade-in-up { animation: none; }
        }
      `}</style>
    </div>
  );
}
