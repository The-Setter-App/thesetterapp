"use client";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { LuBell, LuSearch } from "react-icons/lu";
import { useDashboardSnapshot } from "@/components/dashboard/hooks/useDashboardSnapshot";
import PageHeader from "@/components/layout/PageHeader";
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

export default function Dashboard({
  displayName,
  snapshot: initialSnapshot,
}: {
  displayName: string;
  snapshot: DashboardSnapshot;
}) {
  const [search, setSearch] = React.useState("");
  const snapshot = useDashboardSnapshot(initialSnapshot);
  const router = useRouter();

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
      label: "Conversations",
      value: snapshot.funnel.conversations,
    },
    { label: "Qualified", value: snapshot.funnel.qualified },
    { label: "Links Sent", value: snapshot.funnel.linksSent },
    { label: "Booked", value: snapshot.funnel.booked },
    { label: "Closed", value: snapshot.funnel.closed },
  ];
  const funnelMaxValue = Math.max(...funnelStages.map((s) => s.value), 1);
  const funnelGeometry = buildFunnelGeometry(
    funnelStages.map((stage) => stage.value),
  );
  const funnelSegmentFills = [
    "#D9D2FF",
    "#BFB2FF",
    "#A18FFF",
    "#8771FF",
    "#5235EF",
  ];

  // Search bar state and handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = search.trim();
    if (!trimmed) return;
    router.push(`/leads?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <div
        className="min-h-[100dvh] w-full bg-white"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white">
          {/* Shared page header to keep height/padding consistent with Leads */}
          <PageHeader
            title={`Hi, ${displayName}!`}
            description="Your Setter Dashboard"
            actions={
              <div className="flex items-center justify-between gap-3 md:justify-end md:gap-3">
                <div className="relative cursor-pointer">
                  <LuBell
                    className="h-6 w-6 text-[#606266]"
                    aria-label="Bell"
                  />
                </div>
                <form
                  onSubmit={handleSearchSubmit}
                  style={{
                    width: "100%",
                    maxWidth: "260px",
                    height: "44px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
                    borderRadius: "8px",
                    outline: "1px #F0F2F6 solid",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "white",
                  }}
                >
                  <LuSearch
                    className="h-[14px] w-[14px] text-[#9A9CA2]"
                    aria-label="Search"
                  />
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm font-medium text-[#101011] outline-none transition-colors placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0"
                    style={{
                      border: "none",
                      fontFamily: "Inter, sans-serif",
                      width: "100%",
                    }}
                    aria-label="Search"
                  />
                </form>
              </div>
            }
          />

          <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6 lg:px-8">
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <MetricCard value={totalRevenue} label="Total revenue" />
              <MetricCard value={avgReplyTime} label="Avg reply time" />
              <MetricCard value={revenuePerCall} label="Revenue per call" />
              <MetricCard value={conversationRate} label="Conversation rate" />
              <MetricCard value={avgReplyRate} label="Avg reply rate" />
            </div>

            {/* Funnel Visualizer */}
            <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
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
                    <div className="text-sm font-semibold text-[#101011]">
                      {stage.label}
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
                  {funnelGeometry.segments.map((segment, i) => (
                    <path
                      key={segment.pathD}
                      d={segment.pathD}
                      fill={funnelSegmentFills[i]}
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
          </div>
        </div>
      </div>
    </>
  );
}
