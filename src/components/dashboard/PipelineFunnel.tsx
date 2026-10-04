import type { IconType } from "react-icons";
import {
  LuDollarSign,
  LuFilter,
  LuMessageCircle,
  LuPhone,
  LuStar,
  LuUserPlus,
} from "react-icons/lu";
import surface from "@/components/ui/brandSurface.module.css";
import {
  buildPipeline,
  type PipelineStage,
  type PipelineStageId,
} from "@/lib/dashboard/pipelineStages";
import type { DashboardFunnelSnapshot } from "@/types/dashboard";
import styles from "./dashboard.module.css";
import { orderStyle } from "./orderStyle";
import SinglePillDropdown from "./SinglePillDropdown";

const STAGE_ICONS: Record<PipelineStageId, IconType> = {
  new: LuUserPlus,
  in_contact: LuMessageCircle,
  qualified: LuStar,
  booked: LuPhone,
  won: LuDollarSign,
};

// The brand purple fading tier by tier, the same way the logo's bars do.
const BAR_COLORS = ["#8771FF", "#9685FF", "#A999FF", "#B9ACFF", "#C9BFFF"];
const EMPTY_BAR_COLOR = "#EDE9FF";

// Shared by the header and every row so the columns line up from `md` up.
const ROW_COLUMNS = "md:grid-cols-[9.5rem_minmax(0,1fr)_4rem_5rem]";

interface PipelineFunnelProps {
  funnel: DashboardFunnelSnapshot;
}

interface PipelineRowProps {
  stage: PipelineStage;
  index: number;
  isEmpty: boolean;
}

function PipelineRow({ stage, index, isEmpty }: PipelineRowProps) {
  const Icon = STAGE_ICONS[stage.id];
  const rateDescription =
    stage.rateFromPrevious && stage.previousLabel
      ? `${stage.rateFromPrevious} of ${stage.previousLabel}`
      : null;

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 ${ROW_COLUMNS}`}
    >
      <div className="flex min-w-0 items-center gap-2.5 md:col-start-1 md:row-start-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="truncate text-[0.9375rem] font-medium text-[#101011]">
          {stage.label}
        </span>
      </div>

      <p className="flex items-baseline justify-end gap-2 md:col-start-3 md:row-start-1">
        {stage.rateFromPrevious && (
          <span
            aria-hidden="true"
            className="text-xs font-medium text-[#9A9CA2] md:hidden"
          >
            {stage.rateFromPrevious}
          </span>
        )}
        <span className="text-lg font-semibold tracking-[-0.015em] text-[#101011] tabular-nums">
          {stage.count.toLocaleString()}
        </span>
      </p>

      {/* The track spans the full width; the bar is centred inside it so the
          stages stack into the logo's tapering shape. */}
      <div className="col-span-2 flex h-9 items-center justify-center rounded-full bg-[#F8F7FF] md:col-span-1 md:col-start-2 md:row-start-1 md:h-10">
        <div
          className={`${styles.bar} h-full rounded-full`}
          style={{
            ...orderStyle(index),
            width: `${stage.widthPercent}%`,
            backgroundColor: isEmpty ? EMPTY_BAR_COLOR : BAR_COLORS[index],
          }}
        />
      </div>

      <p className="hidden justify-end md:col-start-4 md:row-start-1 md:flex">
        {stage.rateFromPrevious ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[#F3F0FF] px-2.5 text-xs font-semibold text-[#8771FF] tabular-nums">
            {stage.rateFromPrevious}
          </span>
        ) : (
          <span aria-hidden="true" className="pr-2.5 text-sm text-[#9A9CA2]">
            –
          </span>
        )}
      </p>

      {rateDescription && <span className="sr-only">{rateDescription}</span>}
    </li>
  );
}

export default function PipelineFunnel({ funnel }: PipelineFunnelProps) {
  const { stages, isEmpty } = buildPipeline(funnel);

  return (
    <section
      aria-labelledby="dashboard-pipeline-title"
      style={orderStyle(6)}
      className={`${surface.materialize} rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-7`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="dashboard-pipeline-title"
            className="text-xl font-semibold tracking-[-0.015em] text-[#101011]"
          >
            Pipeline
          </h2>
          <p className="mt-1 text-sm text-[#606266]">
            Where every lead stands right now.
          </p>
        </div>
        <SinglePillDropdown
          icon={
            <LuFilter aria-hidden="true" className="h-4 w-4 text-[#9A9CA2]" />
          }
          label="Default Funnel"
        />
      </div>

      <div
        aria-hidden="true"
        className={`mt-6 hidden gap-x-4 text-xs font-medium text-[#9A9CA2] md:grid ${ROW_COLUMNS}`}
      >
        <span>Stage</span>
        <span />
        <span className="text-right">Leads</span>
        <span className="text-right">vs previous</span>
      </div>

      <ol className="mt-5 space-y-4 md:mt-3 md:space-y-3">
        {stages.map((stage, index) => (
          <PipelineRow
            key={stage.id}
            stage={stage}
            index={index}
            isEmpty={isEmpty}
          />
        ))}
      </ol>

      {isEmpty && (
        <p className="mt-5 text-sm text-[#606266]">
          No leads in the pipeline yet. New conversations will show up here.
        </p>
      )}
    </section>
  );
}
