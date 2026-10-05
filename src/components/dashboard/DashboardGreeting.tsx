import { LuUsers } from "react-icons/lu";
import PageHeader from "@/components/layout/PageHeader";
import surface from "@/components/ui/brandSurface.module.css";
import SinglePillDropdown from "./SinglePillDropdown";

interface DashboardGreetingProps {
  displayName: string;
}

export default function DashboardGreeting({
  displayName,
}: DashboardGreetingProps) {
  return (
    <PageHeader
      divider={false}
      className={`${surface.materialize} !bg-transparent`}
      title={`Hello, ${displayName}`}
      description="Here's how your pipeline is doing."
      actions={
        <SinglePillDropdown
          icon={
            <LuUsers aria-hidden="true" className="h-4 w-4 text-[#9A9CA2]" />
          }
          label="All users"
        />
      }
    />
  );
}
