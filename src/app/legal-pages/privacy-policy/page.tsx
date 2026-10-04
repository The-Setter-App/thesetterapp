import type { Metadata } from "next";
import LegalDocumentPage from "@/components/legal/LegalDocumentPage";
import { privacyPolicy } from "@/lib/legal/privacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy | Setter",
  description: "How Setter collects, uses and protects your information.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocumentPage document={privacyPolicy} />;
}
