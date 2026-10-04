import type { DashboardFunnelSnapshot } from "@/types/dashboard";
import { formatConversionRate } from "./format";

export type PipelineStageId =
  | "new"
  | "in_contact"
  | "qualified"
  | "booked"
  | "won";

export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  count: number;
  // Width of the stage's bar as a share of the widest stage, 0-100.
  widthPercent: number;
  // This stage's size relative to the one before it, when comparable.
  rateFromPrevious: string | null;
  previousLabel: string | null;
}

export interface Pipeline {
  stages: PipelineStage[];
  // True when no lead is in any stage; the bars then show a placeholder
  // shape instead of five slivers.
  isEmpty: boolean;
}

// Narrowest a bar is drawn, so a stage with a few leads stays visible next to
// one with thousands.
const MIN_WIDTH_PERCENT = 6;
const EMPTY_WIDTHS = [100, 80, 60, 40, 20] as const;

const STAGE_DEFINITIONS: {
  id: PipelineStageId;
  label: string;
  read: (funnel: DashboardFunnelSnapshot) => number;
}[] = [
  { id: "new", label: "New", read: (funnel) => funnel.newLead },
  { id: "in_contact", label: "In contact", read: (funnel) => funnel.inContact },
  { id: "qualified", label: "Qualified", read: (funnel) => funnel.qualified },
  { id: "booked", label: "Booked call", read: (funnel) => funnel.booked },
  { id: "won", label: "Won", read: (funnel) => funnel.won },
];

function toCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function buildPipeline(funnel: DashboardFunnelSnapshot): Pipeline {
  const counts = STAGE_DEFINITIONS.map((stage) => toCount(stage.read(funnel)));
  const maxCount = Math.max(...counts, 0);
  const isEmpty = maxCount <= 0;

  const stages = STAGE_DEFINITIONS.map((definition, index) => {
    const count = counts[index];
    const previous = index > 0 ? STAGE_DEFINITIONS[index - 1] : null;

    return {
      id: definition.id,
      label: definition.label,
      count,
      widthPercent: isEmpty
        ? EMPTY_WIDTHS[index]
        : Math.max(MIN_WIDTH_PERCENT, Math.round((count / maxCount) * 100)),
      rateFromPrevious:
        index > 0 ? formatConversionRate(counts[index - 1], count) : null,
      previousLabel: previous ? previous.label : null,
    };
  });

  return { stages, isEmpty };
}
