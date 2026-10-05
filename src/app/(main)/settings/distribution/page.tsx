import { redirect } from "next/navigation";

// Lead distribution now lives on the Team tab. This keeps old links working.
export default function SettingsDistributionPage() {
  redirect("/settings/team#lead-distribution");
}
