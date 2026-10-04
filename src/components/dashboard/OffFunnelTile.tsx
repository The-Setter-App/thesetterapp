import surface from "@/components/ui/brandSurface.module.css";
import type { DashboardFunnelSnapshot } from "@/types/dashboard";
import { orderStyle } from "./orderStyle";

interface OffFunnelTileProps {
  funnel: DashboardFunnelSnapshot;
}

interface OffFunnelRow {
  label: string;
  count: number;
  dotClassName: string;
}

export default function OffFunnelTile({ funnel }: OffFunnelTileProps) {
  const rows: OffFunnelRow[] = [
    {
      label: "Unqualified",
      count: funnel.unqualified,
      dotClassName: "bg-red-500",
    },
    { label: "No show", count: funnel.noShow, dotClassName: "bg-amber-500" },
    // Deposits are not tracked yet, so this always reads zero.
    { label: "Deposit", count: 0, dotClassName: "bg-[#8771FF]" },
  ];

  return (
    <section
      aria-labelledby="dashboard-off-funnel-title"
      style={orderStyle(7)}
      className={`${surface.materialize} flex flex-col rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm md:p-7`}
    >
      <h2
        id="dashboard-off-funnel-title"
        className="text-xl font-semibold tracking-[-0.015em] text-[#101011]"
      >
        Outside the funnel
      </h2>
      <p className="mt-1 text-sm text-[#606266]">
        Leads that left the main path.
      </p>

      <dl className="mt-5 flex flex-1 flex-col justify-center divide-y divide-[#F0F2F6]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <dt className="flex items-center gap-2.5 text-[0.9375rem] font-medium text-[#101011]">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${row.dotClassName}`}
              />
              {row.label}
            </dt>
            <dd className="text-lg font-semibold tracking-[-0.015em] text-[#101011] tabular-nums">
              {row.count.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
