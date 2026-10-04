import surface from "@/components/ui/brandSurface.module.css";
import SetterScoop from "@/components/ui/SetterScoop";
import { splitCurrency } from "@/lib/dashboard/format";
import styles from "./dashboard.module.css";
import { orderStyle } from "./orderStyle";

interface RevenueHeroProps {
  totalRevenue: number;
  wonCount: number;
}

export default function RevenueHero({
  totalRevenue,
  wonCount,
}: RevenueHeroProps) {
  const amount = splitCurrency(totalRevenue);

  return (
    <section
      aria-label="Total revenue"
      style={orderStyle(1)}
      className={`${surface.materialize} ${styles.heroTile} relative flex h-full min-h-[15rem] flex-col justify-between rounded-3xl p-6 text-white shadow-[0_18px_40px_rgba(109,94,214,0.28)] md:min-h-[17rem] md:p-8`}
    >
      {/* Sits on the tile's top edge; its drips share the tile's colour, so
          the tile reads as the ice cream it is melting into. */}
      <SetterScoop className="pointer-events-none absolute -top-[2.3rem] right-6 h-auto w-[5.25rem] md:right-10" />

      <p className="inline-flex h-7 w-fit items-center rounded-full bg-white/20 px-3 text-xs font-semibold">
        Total revenue
      </p>

      <div>
        <p className="min-w-0 break-words text-[clamp(2.75rem,8vw,4.5rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">
          {amount.whole}
          <span className="text-[0.5em] font-medium tracking-[-0.02em] text-white/80">
            {amount.fraction}
          </span>
        </p>
        <p className="mt-4 text-[0.9375rem] font-medium leading-snug">
          From every lead with a recorded payment.{" "}
          <span className="whitespace-nowrap">
            {wonCount.toLocaleString()} marked won.
          </span>
        </p>
      </div>
    </section>
  );
}
