"use client";

import Head from "next/head";
import Link from "next/link";
import React from "react";
import {
  LuChevronDown,
  LuDollarSign,
  LuFilter,
  LuMessageCircle,
  LuPhone,
  LuStar,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { useDashboardSnapshot } from "@/components/dashboard/hooks/useDashboardSnapshot";
import { buildFunnelGeometry } from "@/lib/dashboard/funnelGeometry";
import type { DashboardSnapshot } from "@/types/dashboard";

interface MetricCardProps {
  value: string;
  label: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatReplyTime(replyTimeMs: number | null): string {
  if (replyTimeMs === null) return "N/A";

  const totalSeconds = Math.round(replyTimeMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds} sec`;
  }

  const totalMinutes = replyTimeMs / (60 * 1000);
  if (totalMinutes < 60) {
    return `${totalMinutes.toFixed(1)} min`;
  }

  const totalHours = totalMinutes / 60;
  if (totalHours < 24) {
    return `${totalHours.toFixed(1)} hr`;
  }

  const totalDays = totalHours / 24;
  return `${totalDays.toFixed(1)} day`;
}

function formatRate(rate: number | null): string {
  return rate === null ? "N/A" : `${rate}%`;
}

function NoConnectedAccountsState({ displayName }: { displayName: string }) {
  return (
    <div className="min-h-[100dvh] bg-[#F8F7FF] px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl items-center justify-center">
        <div className="w-full rounded-2xl border border-[#F0F2F6] bg-white p-6 text-center shadow-sm md:p-8">
          <h2 className="text-xl font-semibold text-[#101011]">
            Hi, {displayName}
          </h2>
          <p className="mt-2 text-sm text-[#606266] md:text-base">
            Connect your Instagram account in Settings to load live dashboard
            metrics.
          </p>
          <Link
            href="/settings"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#8771FF] px-5 text-sm font-medium text-white transition-colors hover:bg-[#6d5ed6] md:w-auto"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ value, label }: MetricCardProps) => (
  <div className="flex h-full w-full flex-col gap-2 rounded-2xl border border-[#F0F2F6] bg-white p-5 shadow-sm">
    <div className="text-sm text-[#8A8D98]">{label}</div>
    <div className="text-[28px] font-bold leading-none text-[#101011]">
      {value}
    </div>
  </div>
);

function formatConversionRate(
  fromCount: number,
  toCount: number,
): string | null {
  if (fromCount <= 0) return null;
  const rate = (toCount / fromCount) * 100;
  if (!Number.isFinite(rate)) return null;
  return rate >= 10 ? `${Math.round(rate)}%` : `${rate.toFixed(1)}%`;
}

/** A dropdown-styled trigger with exactly one selectable option. There's no
 * backend to filter by yet, so this stays honest about only offering the
 * one real choice instead of pretending to be a working multi-option filter. */
function SinglePillDropdown({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#F0F2F6] bg-white px-4 text-sm font-medium text-[#101011] shadow-sm transition-colors hover:bg-[#F8F7FF]"
      >
        {icon}
        <span>{label}</span>
        <LuChevronDown
          className={`h-3.5 w-3.5 text-[#8A8D98] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 rounded-xl border border-[#F0F2F6] bg-white p-1 shadow-sm">
          <div className="flex h-9 items-center rounded-lg bg-[rgba(135,113,255,0.1)] px-3 text-sm font-medium text-[#8771FF]">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({
  displayName,
  snapshot: initialSnapshot,
}: {
  displayName: string;
  snapshot: DashboardSnapshot;
}) {
  const snapshot = useDashboardSnapshot(initialSnapshot);
  const funnelGradientId = React.useId().replace(/:/g, "");

  if (!snapshot.hasConnectedAccounts) {
    return <NoConnectedAccountsState displayName={displayName} />;
  }

  const totalRevenue = formatCurrency(snapshot.metrics.totalRevenue);
  const avgReplyTime = formatReplyTime(snapshot.metrics.avgReplyTimeMs);
  const revenuePerCall = formatCurrency(snapshot.metrics.revenuePerCall);
  const conversationRate = `${snapshot.metrics.conversationRate}%`;
  const avgReplyRate = formatRate(snapshot.metrics.avgReplyRate);

  const funnelStages = [
    {
      label: "New",
      value: snapshot.funnel.newLead,
      icon: LuUserPlus,
      color: "#F472B6",
    },
    {
      label: "In contact",
      value: snapshot.funnel.inContact,
      icon: LuMessageCircle,
      color: "#22C55E",
    },
    {
      label: "Qualified",
      value: snapshot.funnel.qualified,
      icon: LuStar,
      color: "#FBBF24",
    },
    {
      label: "Booked call",
      value: snapshot.funnel.booked,
      icon: LuPhone,
      color: "#5B21B6",
    },
    {
      label: "Won",
      value: snapshot.funnel.won,
      icon: LuDollarSign,
      color: "#16A34A",
    },
  ];
  const funnelMaxValue = Math.max(...funnelStages.map((s) => s.value), 1);
  const funnelGeometry = buildFunnelGeometry(
    funnelStages.map((stage) => stage.value),
  );

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div
        className="min-h-[100dvh] w-full bg-[#F3F2FB]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#101011]">
                  Hello, {displayName}!
                </h1>
                <p className="mt-1 text-sm text-[#8A8D98]">
                  Your Manager dashboard
                </p>
              </div>
              <SinglePillDropdown
                icon={<LuUsers className="h-4 w-4 text-[#8A8D98]" />}
                label="All users"
              />
            </div>

            {/* Metrics Grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <MetricCard value={totalRevenue} label="Total revenue" />
              <MetricCard value={avgReplyTime} label="Avg reply time" />
              <MetricCard value={revenuePerCall} label="Revenue per call" />
              <MetricCard value={conversationRate} label="Conversation rate" />
              <MetricCard value={avgReplyRate} label="Avg reply rate" />
            </div>

            {/* Funnel filter */}
            <div className="mt-6">
              <SinglePillDropdown
                icon={<LuFilter className="h-4 w-4 text-[#8A8D98]" />}
                label="Default Funnel"
              />
            </div>

            {/* Funnel */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#F0F2F6]">
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
                {funnelStages.map((stage, i) => (
                  <div
                    key={stage.label}
                    className={
                      i !== funnelStages.length - 1
                        ? "lg:border-r lg:border-[#F0F2F6] lg:pr-5"
                        : undefined
                    }
                    style={i > 0 ? { paddingLeft: 20 } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${stage.color}1A` }}
                      >
                        <stage.icon
                          className="h-3.5 w-3.5"
                          style={{ color: stage.color }}
                        />
                      </span>
                      <span className="text-sm font-medium text-[#8A8D98]">
                        {stage.label}
                      </span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-[#101011]">
                      {stage.value.toLocaleString()}
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F2F6]">
                      <div
                        className="h-full rounded-full bg-[#8771FF]"
                        style={{
                          width: `${Math.max(4, Math.round((stage.value / funnelMaxValue) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative hidden h-[220px] border-t border-[#F0F2F6] lg:block">
                <svg
                  aria-hidden="true"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <defs>
                    <linearGradient
                      id={funnelGradientId}
                      gradientUnits="userSpaceOnUse"
                      x1="0"
                      y1="0"
                      x2="100"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#DCEBFF" />
                      <stop offset="55%" stopColor="#5B9DFF" />
                      <stop offset="100%" stopColor="#1D4ED8" />
                    </linearGradient>
                  </defs>
                  {funnelGeometry.segments.map((segment) => (
                    <path
                      key={segment.pathD}
                      d={segment.pathD}
                      fill={`url(#${funnelGradientId})`}
                    />
                  ))}
                </svg>
                <div className="pointer-events-none absolute inset-0 grid grid-cols-5">
                  {funnelStages.slice(0, -1).map((stage, i) => {
                    const rate = formatConversionRate(
                      stage.value,
                      funnelStages[i + 1].value,
                    );
                    return (
                      <div
                        key={stage.label}
                        className="relative"
                        style={{ gridColumn: i + 1 }}
                      >
                        {rate && (
                          <span className="absolute top-3 right-0 translate-x-1/2 whitespace-nowrap rounded-full border border-[#F0F2F6] bg-white px-2.5 py-1 text-xs font-semibold text-[#101011] shadow-sm">
                            {rate} →
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Off-funnel status badges */}
            <div className="mt-4 flex flex-wrap items-center gap-5 px-1 text-sm text-[#606266]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Unqualified: {snapshot.funnel.unqualified}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Deposit: 0
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                No show: {snapshot.funnel.noShow}
              </span>
            </div>

            {/* Payments */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#F0F2F6] p-5">
                <div className="text-sm font-semibold text-[#101011]">
                  Upcoming Payments
                </div>
                <div className="mt-4">
                  <div className="text-xs text-[#8A8D98]">Total Pending</div>
                  <div className="mt-1 text-2xl font-bold text-[#101011]">
                    $0
                  </div>
                </div>
                <div className="mt-3 text-xs text-[#B5B7C0]">
                  Payment collection tracking isn&apos;t wired up yet.
                </div>
              </div>
              <div className="rounded-2xl border border-[#F0F2F6] p-5">
                <div className="text-sm font-semibold text-[#101011]">
                  Recent Collections
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-[#8A8D98]">Cash Collected</div>
                    <div className="mt-1 text-2xl font-bold text-[#101011]">
                      $0
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#8A8D98]">Commission</div>
                    <div className="mt-1 text-2xl font-bold text-[#101011]">
                      $0
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-[#B5B7C0]">
                  Payment collection tracking isn&apos;t wired up yet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
