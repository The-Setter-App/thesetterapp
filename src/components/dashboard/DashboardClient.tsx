"use client";

import Head from "next/head";
import Link from "next/link";
import React from "react";
import {
  LuBadgePercent,
  LuBell,
  LuDollarSign,
  LuHourglass,
  LuReply,
  LuSearch,
} from "react-icons/lu";
import { buildFunnelGeometry } from "@/lib/dashboard/funnelGeometry";
import type { DashboardSnapshot } from "@/types/dashboard";

interface MetricCardProps {
  value: string;
  label: string;
  icon: React.ReactNode;
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

const MetricCard = ({ value, label, icon }: MetricCardProps) => (
  <div
    className="w-full m-1 rounded-xl border border-[#F0F2F6] p-4 md:p-5 flex items-center gap-4"
    style={{ background: "rgba(135, 113, 255, 0.10)" }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: "rgba(82, 53, 239, 0.20)" }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          width: "100%",
          color: "#101011",
          fontSize: 22,
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          wordWrap: "break-word",
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: "100%",
          color: "black",
          fontSize: 14,
          fontFamily: "Inter, sans-serif",
          fontWeight: 400,
          wordWrap: "break-word",
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

export default function Dashboard({
  displayName,
  snapshot,
}: {
  displayName: string;
  snapshot: DashboardSnapshot;
}) {
  const funnelClipPathId = React.useId().replace(/:/g, "");
  const [search, setSearch] = React.useState("");

  if (!snapshot.hasConnectedAccounts) {
    return <NoConnectedAccountsState displayName={displayName} />;
  }

  const totalRevenue = formatCurrency(snapshot.metrics.totalRevenue);
  const avgReplyTime = formatReplyTime(snapshot.metrics.avgReplyTimeMs);
  const revenuePerCall = formatCurrency(snapshot.metrics.revenuePerCall);
  const conversationRate = `${snapshot.metrics.conversationRate}%`;
  const avgReplyRate = formatRate(snapshot.metrics.avgReplyRate);

  const funnelGeometry = buildFunnelGeometry([
    snapshot.funnel.conversations,
    snapshot.funnel.qualified,
    snapshot.funnel.linksSent,
    snapshot.funnel.booked,
    snapshot.funnel.closed,
  ]);

  // SVG icon components
  const iconClassName = "text-[#5235EF]";
  const DollarIcon = (
    <LuDollarSign className={`${iconClassName} h-[30px] w-[30px]`} />
  );
  const HourglassIcon = (
    <LuHourglass className={`${iconClassName} h-[30px] w-[30px]`} />
  );
  const ConversionRateIcon = (
    <LuBadgePercent className={`${iconClassName} h-6 w-6`} />
  );
  const ReplyIcon = <LuReply className={`${iconClassName} h-7 w-6`} />;

  // Search bar state and handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };
  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert(`Searching for: ${search}`);
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
          {/* Header - Styled from Figma */}
          <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-[#F0F2F6] bg-white px-3 py-4 md:flex-row md:items-center md:justify-between md:px-5 md:py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-[#101011] md:text-2xl">
                Hi, {displayName}!
              </h1>
              <p className="text-xs text-[#606266] md:text-sm">
                Your Setter Dashboard
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end md:gap-3">
              <div className="relative cursor-pointer">
                <LuBell className="h-6 w-6 text-[#606266]" aria-label="Bell" />
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
          </header>

          <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Metrics Grid */}
            <div className="px-3 md:px-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 md:gap-4">
              <MetricCard
                value={totalRevenue}
                label="Total revenue"
                icon={DollarIcon}
              />
              <MetricCard
                value={avgReplyTime}
                label="Avg reply time"
                icon={HourglassIcon}
              />
              <MetricCard
                value={revenuePerCall}
                label="Revenue per call"
                icon={DollarIcon}
              />
              <MetricCard
                value={conversationRate}
                label="Conversation rate"
                icon={ConversionRateIcon}
              />
              <MetricCard
                value={avgReplyRate}
                label="Avg reply rate"
                icon={ReplyIcon}
              />
            </div>

            {/* Funnel Visualizer */}
            <div className="mx-3 md:mx-5 relative h-[357px] bg-white border border-[rgba(135,113,255,0.2)] rounded-[20px] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0">
                <svg
                  aria-hidden="true"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <defs>
                    <clipPath id={funnelClipPathId}>
                      <path d={funnelGeometry.pathD} />
                    </clipPath>
                  </defs>

                  {funnelGeometry.segments.map((segment) => (
                    <path
                      key={segment.pathD}
                      d={segment.pathD}
                      fill="#8771FF"
                      opacity={segment.opacity}
                    />
                  ))}

                  <line
                    clipPath={`url(#${funnelClipPathId})`}
                    stroke="rgba(86,90,104,0.55)"
                    strokeWidth="0.35"
                    x1="0"
                    x2="100"
                    y1={funnelGeometry.centerLineY}
                    y2={funnelGeometry.centerLineY}
                  />
                </svg>
              </div>
              <div className="relative z-10 grid h-full grid-cols-5">
                {[
                  {
                    label: "Conversations",
                    value: snapshot.funnel.conversations.toLocaleString(),
                  },
                  {
                    label: "Qualified",
                    value: snapshot.funnel.qualified.toLocaleString(),
                  },
                  {
                    label: "Links Sent",
                    value: snapshot.funnel.linksSent.toLocaleString(),
                  },
                  {
                    label: "Booked",
                    value: snapshot.funnel.booked.toLocaleString(),
                  },
                  {
                    label: "Closed",
                    value: snapshot.funnel.closed.toLocaleString(),
                  },
                ].map((step, i, arr) => (
                  <div
                    key={step.label}
                    className={`p-4 flex flex-col gap-3 ${i !== arr.length - 1 ? "border-r border-[rgba(135,113,255,0.2)]" : ""}`}
                  >
                    <div
                      style={{
                        color: "#101011",
                        fontSize: 14,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                        wordWrap: "break-word",
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        color: "#8771FF",
                        fontSize: 24,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                        wordWrap: "break-word",
                        marginTop: 4,
                      }}
                    >
                      {step.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
