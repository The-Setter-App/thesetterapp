import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import surface from "@/components/ui/brandSurface.module.css";
import type { DashboardSnapshot } from "@/types/dashboard";
import DashboardGreeting from "./DashboardGreeting";
import DashboardStatGrid from "./DashboardStatGrid";
import OffFunnelTile from "./OffFunnelTile";
import PaymentsTiles from "./PaymentsTiles";
import PipelineFunnel from "./PipelineFunnel";
import RevenueHero from "./RevenueHero";

interface DashboardViewProps {
  displayName: string;
  snapshot: DashboardSnapshot;
}

// Layout of the dashboard for a workspace with a connected account. It only
// arranges the sections; each one owns its own content.
export default function DashboardView({
  displayName,
  snapshot,
}: DashboardViewProps) {
  return (
    <div
      className={`${surface.surface} ${surface.glow} h-full w-full overflow-y-auto`}
    >
      {/* Left-aligned like every other page, so the title starts at the same
          edge; the cap only stops the tiles stretching on very wide screens. */}
      <div className="w-full max-w-[1400px] pb-10 md:pb-14">
        <DashboardGreeting displayName={displayName} />

        <div className={PAGE_GUTTER_CLASS}>
          {/* The top margin leaves room for the scoop on the revenue tile. */}
          <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <RevenueHero
                totalRevenue={snapshot.metrics.totalRevenue}
                wonCount={snapshot.funnel.won}
              />
            </div>
            <div className="lg:col-span-5">
              <DashboardStatGrid metrics={snapshot.metrics} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <PipelineFunnel funnel={snapshot.funnel} />
            </div>
            <div className="flex lg:col-span-4 [&>*]:flex-1">
              <OffFunnelTile funnel={snapshot.funnel} />
            </div>
          </div>

          <div className="mt-4">
            <PaymentsTiles />
          </div>
        </div>
      </div>
    </div>
  );
}
