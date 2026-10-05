import surface from "@/components/ui/brandSurface.module.css";
import { orderStyle } from "./orderStyle";

interface PaymentFigure {
  label: string;
  value: string;
}

interface PaymentTileProps {
  title: string;
  figures: PaymentFigure[];
  order: number;
}

// Payment collection is not tracked yet. The tiles are tinted and labelled so
// the zeros read as "not available" rather than as real figures.
function PaymentTile({ title, figures, order }: PaymentTileProps) {
  return (
    <section
      aria-label={title}
      style={orderStyle(order)}
      className={`${surface.materialize} rounded-3xl bg-[#F8F7FF] p-5 md:p-7`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#101011]">{title}</h2>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-white px-2.5 text-xs font-semibold text-[#8771FF]">
          Coming soon
        </span>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt className="text-sm text-[#606266]">{figure.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#9A9CA2] tabular-nums">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[0.8125rem] text-[#606266]">
        Payment collection tracking isn't available yet.
      </p>
    </section>
  );
}

export default function PaymentsTiles() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <PaymentTile
        order={9}
        title="Upcoming payments"
        figures={[{ label: "Total pending", value: "$0" }]}
      />
      <PaymentTile
        order={10}
        title="Recent collections"
        figures={[
          { label: "Cash collected", value: "$0" },
          { label: "Commission", value: "$0" },
        ]}
      />
    </div>
  );
}
