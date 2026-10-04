import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";
import { termsOfService } from "@/lib/legal/termsOfService";

export const metadata: Metadata = {
  title: "Terms of Service | Setter",
  description: "The terms that govern your use of Setter.",
};

export default function TermsOfServicePage() {
  return <LegalDocumentPage document={termsOfService} />;
}
