import { Suspense } from "react";
import LeadsPageClient from "@/components/leads/LeadsPageClient";

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageClient />
    </Suspense>
  );
}
