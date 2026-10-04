import type { IconType } from "react-icons";
import surface from "@/components/ui/brandSurface.module.css";
import { orderStyle } from "./orderStyle";

interface StatTileProps {
  icon: IconType;
  label: string;
  value: string;
  // One line saying what the number measures.
  caption: string;
  order: number;
}

export default function StatTile({
  icon: Icon,
  label,
  value,
  caption,
  order,
}: StatTileProps) {
  return (
    <div
      style={orderStyle(order)}
      className={`${surface.materialize} flex flex-col rounded-3xl border border-[#F0F2F6] bg-white p-5 shadow-sm`}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <p className="text-sm font-medium text-[#606266]">{label}</p>
      </div>
      <p className="mt-5 text-[1.75rem] font-semibold leading-none tracking-[-0.025em] text-[#101011] tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-balance text-[0.8125rem] leading-snug text-[#9A9CA2]">
        {caption}
      </p>
    </div>
  );
}
