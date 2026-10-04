import { LuUsers } from "react-icons/lu";
import surface from "@/components/ui/brandSurface.module.css";
import SinglePillDropdown from "./SinglePillDropdown";

interface DashboardGreetingProps {
  displayName: string;
}

export default function DashboardGreeting({
  displayName,
}: DashboardGreetingProps) {
  return (
    <header
      className={`${surface.materialize} flex flex-col gap-4 md:flex-row md:items-end md:justify-between`}
    >
      <div className="min-w-0">
        <p className="inline-flex h-7 items-center rounded-full bg-[#F3F0FF] px-3 text-xs font-semibold text-[#8771FF]">
          Dashboard
        </p>
        <h1 className="mt-3 text-balance text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#101011] md:text-[2.5rem]">
          Hello, {displayName}
        </h1>
        <p className="mt-2 text-[1.0625rem] leading-[1.45] text-[#606266]">
          Here's how your pipeline is doing.
        </p>
      </div>
      <SinglePillDropdown
        icon={<LuUsers aria-hidden="true" className="h-4 w-4 text-[#9A9CA2]" />}
        label="All users"
      />
    </header>
  );
}
