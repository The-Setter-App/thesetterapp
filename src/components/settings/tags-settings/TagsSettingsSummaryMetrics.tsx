"use client";

import { PRESET_TAG_ROWS } from "@/lib/tags/config";

interface SummaryMetricProps {
  title: string;
  value: number;
  subtitle: string;
}

function SummaryMetric({ title, value, subtitle }: SummaryMetricProps) {
  return (
    <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#606266]">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-[#101011]">{value}</p>
      <p className="mt-0.5 text-xs text-[#606266]">{subtitle}</p>
    </div>
  );
}

interface TagsSettingsSummaryMetricsProps {
  totalTags: number;
  customTagsCount: number;
}

export default function TagsSettingsSummaryMetrics({
  totalTags,
  customTagsCount,
}: TagsSettingsSummaryMetricsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#F0F2F6] px-6 py-6 md:grid-cols-3 md:px-8">
      <SummaryMetric
        title="Total statuses"
        value={totalTags}
        subtitle="Default and custom combined"
      />
      <SummaryMetric
        title="Default"
        value={PRESET_TAG_ROWS.length}
        subtitle="Built-in statuses"
      />
      <SummaryMetric
        title="Custom"
        value={customTagsCount}
        subtitle="Workspace custom statuses"
      />
    </div>
  );
}