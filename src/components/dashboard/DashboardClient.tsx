'use client';

import React from 'react';
import Head from 'next/head';
import { initialLeadsData } from '@/data/mockLeadsData';

interface MetricCardProps {
  value: string;
  label: string;
  icon: React.ReactNode;
}

const MetricCard = ({ value, label, icon }: MetricCardProps) => (
  <div
    className="w-full m-1 rounded-xl border border-[#F0F2F6] p-4 md:p-5 flex items-center gap-4"
    style={{ background: 'rgba(135, 113, 255, 0.10)' }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: 'rgba(82, 53, 239, 0.20)' }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          width: '100%',
          color: '#101011',
          fontSize: 22,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 700,
          wordWrap: 'break-word'
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: '100%',
          color: 'black',
          fontSize: 14,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 400,
          wordWrap: 'break-word'
        }}
      >
        {label}
      </div>
    </div>
  </div>
);

export default function Dashboard({ displayName }: { displayName: string }) {
  // --- Funnel Data Logic ---
  // In a real app, fetch conversations from DB/API. Here, use leads as mock for demo.
  // Number of conversations: count of all leads (or replace with real conversations count)
  const conversationsCount = initialLeadsData.length;
  // Number of qualified leads
  const qualifiedCount = initialLeadsData.filter(l => l.status === 'Qualified').length;
  // Number of booked leads
  const bookedCount = initialLeadsData.filter(l => l.status === 'Booked').length;
  // Number of closed leads (status 'Won')
  const closedCount = initialLeadsData.filter(l => l.status === 'Won').length;

  // --- Metric Card Calculations ---
  // Total revenue: sum of all leads with a cash value (strip $ and commas)
  const totalRevenue = initialLeadsData.reduce((sum, l) => {
    if (l.cash && l.cash.startsWith('$')) {
      const num = Number(l.cash.replace(/[^\d.]/g, ''));
      return sum + (isNaN(num) ? 0 : num);
    }
    return sum;
  }, 0);

  // Revenue per call: average of all leads with a cash value
  const revenueLeads = initialLeadsData.filter(l => l.cash && l.cash.startsWith('$'));
  const revenuePerCall = revenueLeads.length > 0 ? totalRevenue / revenueLeads.length : 0;



  // --- Average Reply Time Calculation (Formula-based) ---
  let totalReplyGap = 0;
  let totalReplies = 0;
  initialLeadsData.forEach(l => {
    if (typeof l.messageCount === 'number' && l.messageCount > 0 && l.interacted) {
      // Parse interacted to minutes (as last gap)
      const interacted = l.interacted.toLowerCase();
      let gap = 0;
      if (interacted.includes('second')) {
        const n = parseFloat(interacted);
        gap = isNaN(n) ? 0 : n / 60;
      } else if (interacted.includes('min')) {
        const n = parseFloat(interacted);
        gap = isNaN(n) ? 0 : n;
      } else if (interacted.includes('hour')) {
        const n = parseFloat(interacted);
        gap = isNaN(n) ? 0 : n * 60;
      } else if (interacted.includes('day')) {
        const n = parseFloat(interacted);
        gap = isNaN(n) ? 0 : n * 60 * 24;
      } else if (interacted.includes('month')) {
        const n = parseFloat(interacted);
        gap = isNaN(n) ? 0 : n * 60 * 24 * 30;
      }
      // Assume each reply has similar gap (mock)
      totalReplyGap += gap * l.messageCount;
      totalReplies += l.messageCount;
    }
  });
  const avgReplyTimeNum = totalReplies > 0 ? totalReplyGap / totalReplies : null;
  const avgReplyTime = avgReplyTimeNum !== null ? `${avgReplyTimeNum < 1 ? Math.round(avgReplyTimeNum * 60) + ' sec' : avgReplyTimeNum.toFixed(1) + ' min'}` : 'N/A';

  // --- Average Reply Rate Calculation (Formula-based) ---
  // Conversations with a Setter reply = leads with messageCount >= 1
  // Total incoming conversations = all leads
  const conversationsWithSetterReply = initialLeadsData.filter(l => typeof l.messageCount === 'number' && l.messageCount > 0).length;
  const totalIncomingConversations = initialLeadsData.length;
  const avgReplyRate = totalIncomingConversations > 0 ? `${Math.round((conversationsWithSetterReply / totalIncomingConversations) * 100)}%` : 'N/A';

  // Conversation rate: percent of leads that are qualified/booked/won out of all leads
  const conversionCount = initialLeadsData.filter(l => ['Qualified', 'Booked', 'Won'].includes(l.status)).length;
  const conversationRate = initialLeadsData.length > 0 ? Math.round((conversionCount / initialLeadsData.length) * 100) : 0;
  const funnelClipPath = 'polygon(0% 33%, 20% 49%, 40% 55%, 60% 58%, 80% 59.5%, 100% 60%, 100% 62%, 80% 62.5%, 60% 63%, 40% 66%, 20% 72%, 0% 88%)';
  const funnelSegments = [
    { start: 0, end: 20, upperStart: 33, upperEnd: 49, lowerStart: 88, lowerEnd: 72, opacity: 1 },
    { start: 20, end: 40, upperStart: 49, upperEnd: 55, lowerStart: 72, lowerEnd: 66, opacity: 0.8 },
    { start: 40, end: 60, upperStart: 55, upperEnd: 58, lowerStart: 66, lowerEnd: 63, opacity: 0.6 },
    { start: 60, end: 80, upperStart: 58, upperEnd: 59.5, lowerStart: 63, lowerEnd: 62.5, opacity: 0.4 },
    { start: 80, end: 100, upperStart: 59.5, upperEnd: 60, lowerStart: 62.5, lowerEnd: 62, opacity: 0.2 },
  ];

  // SVG icon components
  const DollarIcon = (
    <img src="/dashboardIcons/dollar.svg" alt="Dollar" width={30} height={30} />
  );
  const HourglassIcon = (
    <img src="/dashboardIcons/hourglass.svg" alt="Hourglass" width={30} height={30} />
  );
  const ConversionRateIcon = (
    <img src="/dashboardIcons/conversion-rate.svg" alt="Conversion Rate" width={24} height={24} />
  );
  const ReplyIcon = (
    <img src="/dashboardIcons/reply.svg" alt="Reply" width={23} height={28} />
  );

  // Search bar state and handler
  const [search, setSearch] = React.useState("");
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-[100dvh] w-full bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-white">
          {/* Header - Styled from Figma */}
          <header className="flex flex-col gap-4 border-b border-[#F0F2F6] px-3 py-4 md:flex-row md:items-center md:justify-between md:px-5 md:py-6">
            <div className="flex flex-col gap-1">
              <div style={{
                color: '#101011',
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '28px',
                fontFamily: 'Inter, sans-serif'
              }}>
                Hi, {displayName}!
              </div>
              <div style={{
                color: '#606266',
                fontSize: '14px',
                fontWeight: 400,
                lineHeight: '20px',
                fontFamily: 'Inter, sans-serif'
              }}>
                Your Setter Dashboard
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end md:gap-3">
              <div className="relative cursor-pointer">
                <img src="/dashboardIcons/bell.svg" alt="Bell" width={24} height={24} />
              </div>
              <form
                onSubmit={handleSearchSubmit}
                style={{
                  width: '100%',
                  maxWidth: '260px',
                  height: '44px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
                  borderRadius: '8px',
                  outline: '1px #F0F2F6 solid',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'white'
                }}
              >
                <img src="/dashboardIcons/search.svg" alt="Search" width={14} height={14} />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Search"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: '#101011',
                    fontSize: '14px',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    width: '100%'
                  }}
                  aria-label="Search"
                />
              </form>
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Metrics Grid */}
            <div className="px-3 md:px-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 md:gap-4">
              <MetricCard value={`$${totalRevenue.toLocaleString()}`} label="Total revenue" icon={DollarIcon} />
              <MetricCard value={avgReplyTime} label="Avg reply time" icon={HourglassIcon} />
              <MetricCard value={`$${revenuePerCall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} label="Revenue per call" icon={DollarIcon} />
              <MetricCard value={`${conversationRate}%`} label="Conversation rate" icon={ConversionRateIcon} />
              <MetricCard value={avgReplyRate} label="Avg reply rate" icon={ReplyIcon} />
            </div>

            {/* Funnel Visualizer */}
            <div className="mx-3 md:mx-5 relative h-[357px] bg-white border border-[rgba(135,113,255,0.2)] rounded-[20px] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 z-0">
                {funnelSegments.map((segment) => (
                  <div
                    key={`${segment.start}-${segment.end}`}
                    className="absolute inset-0 bg-[#8771FF]"
                    style={{
                      opacity: segment.opacity,
                      clipPath: `polygon(${segment.start}% ${segment.upperStart}%, ${segment.end}% ${segment.upperEnd}%, ${segment.end}% ${segment.lowerEnd}%, ${segment.start}% ${segment.lowerStart}%)`
                    }}
                  />
                ))}
                <div className="absolute inset-0 z-20" style={{ clipPath: funnelClipPath }}>
                  <div
                    className="absolute left-0 right-0 h-px bg-[rgba(86,90,104,0.55)]"
                    style={{ top: "60.9%" }}
                  />
                </div>
              </div>
              <div className="relative z-10 grid h-full grid-cols-5">
                {[
                  { label: 'Conversations', value: conversationsCount.toLocaleString() },
                  { label: 'Qualified', value: qualifiedCount.toLocaleString() },
                  { label: 'Links Sent', value: '861' },
                  { label: 'Booked', value: bookedCount.toLocaleString() },
                  { label: 'Closed', value: closedCount.toLocaleString() }
                ].map((step, i, arr) => (
                  <div key={step.label} className={`p-4 flex flex-col gap-3 ${i !== arr.length - 1 ? 'border-r border-[rgba(135,113,255,0.2)]' : ''}`}>
                    <div
                      style={{
                        color: '#101011',
                        fontSize: 14,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        wordWrap: 'break-word'
                      }}
                    >
                      {step.label}
                    </div>
                    <div
                      style={{
                        color: '#8771FF',
                        fontSize: 24,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 700,
                        wordWrap: 'break-word',
                        marginTop: 4
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
