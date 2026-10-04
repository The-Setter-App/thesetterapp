import type { Metadata, Viewport } from "next";
import WaitlistFooter from "@/components/waitlist/WaitlistFooter";
import WaitlistForm from "@/components/waitlist/WaitlistForm";
import WaitlistHeader from "@/components/waitlist/WaitlistHeader";
import WaitlistHero from "@/components/waitlist/WaitlistHero";
import styles from "@/components/waitlist/waitlist.module.css";

const DESCRIPTION =
  "Setter is the Instagram inbox built for sales teams. Join the waitlist for early access.";

export const metadata: Metadata = {
  title: "Join the waitlist | Setter",
  description: DESCRIPTION,
  openGraph: {
    title: "Join the Setter waitlist",
    description: DESCRIPTION,
    type: "website",
  },
};

// Matches the page surface so browsers that tint their toolbar use white.
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function WaitlistPage() {
  return (
    <main className={`${styles.page} flex min-h-dvh flex-col`}>
      <WaitlistHeader />
      <WaitlistHero>
        <WaitlistForm />
      </WaitlistHero>
      <WaitlistFooter />
    </main>
  );
}
