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
    className="p-6 rounded-2xl flex items-center gap-4 flex-1"
    style={{ background: 'rgba(135, 113, 255, 0.10)' }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center"
      style={{ background: '#5235EF' }}
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

export default function Dashboard() {
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
      <div className="min-h-screen bg-white p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="max-w-[1400px] mx-auto space-y-10">
          
          {/* Header - Styled from Figma */}
          <header className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              <div style={{
                color: '#101011',
                fontSize: '18px',
                fontWeight: 500,
                lineHeight: '28px',
                fontFamily: 'Inter, sans-serif'
              }}>
                Hi, Kelvin!
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
            <div className="flex items-center gap-6">
              <div className="relative cursor-pointer">
                <img src="/dashboardIcons/bell.svg" alt="Bell" width={20} height={20} />
              </div>
              <form
                onSubmit={handleSearchSubmit}
                style={{
                  width: '220px',
                  height: '40px',
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

          {/* Figma-style Bottom Border Divider */}
          {/* Note: marginHorizontal -32px offsets the p-8 padding of the parent container */}
          <div 
            style={{ 
              borderBottom: '1px solid #F0F2F6', 
              marginTop: '16px', 
              marginBottom: '16px',
              marginLeft: '-32px', 
              marginRight: '-32px' 
            }} 
          />

          {/* Metrics Grid */}
          <div className="flex flex-wrap gap-4">
            <MetricCard value={`$${totalRevenue.toLocaleString()}`} label="Total revenue" icon={DollarIcon} />
            <MetricCard value={avgReplyTime} label="Avg reply time" icon={HourglassIcon} />
            <MetricCard value={`$${revenuePerCall.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} label="Revenue per call" icon={DollarIcon} />
            <MetricCard value={`${conversationRate}%`} label="Conversation rate" icon={ConversionRateIcon} />
            <MetricCard value={avgReplyRate} label="Avg reply rate" icon={ReplyIcon} />
          </div>

          {/* Funnel Visualizer */}
          <div className="bg-white border border-[#F0F2F6] rounded-[24px] overflow-hidden flex min-h-[400px]">
            {[
              { label: 'Conversations', value: conversationsCount.toLocaleString(), clip: 'polygon(0 15%, 100% 35%, 100% 65%, 0 85%)', opacity: 0.7 },
              { label: 'Qualified', value: qualifiedCount.toLocaleString(), clip: 'polygon(0 35%, 100% 42%, 100% 58%, 0 65%)', opacity: 0.7 },
              { label: 'Links Sent', value: '861', clip: 'polygon(0 42%, 100% 46%, 100% 54%, 0 58%)', opacity: 0.6 },
              { label: 'Booked', value: bookedCount.toLocaleString(), clip: 'polygon(0 46%, 100% 48%, 100% 52%, 0 54%)', opacity: 0.5 },
              { label: 'Closed', value: closedCount.toLocaleString(), clip: 'polygon(0 48%, 100% 49%, 100% 51%, 0 52%)', opacity: 0.4 }
            ].map((step, i, arr) => (
              <div key={step.label} className={`flex-1 p-8 relative flex flex-col ${i !== arr.length - 1 ? 'border-r border-[#F0F2F6]' : ''}`}>
                <div className="z-10">
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
                <div
                  className="absolute inset-0 bg-[#8771FF]"
                  style={{
                    clipPath: step.clip,
                    opacity: step.opacity,
                    top: '100px'
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}