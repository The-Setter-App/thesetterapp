import Link from "next/link";
import { LEGAL_ROUTES } from "@/lib/legal/routes";

const LEGAL_LINKS = [
  { label: "Terms", href: LEGAL_ROUTES.terms },
  { label: "Privacy", href: LEGAL_ROUTES.privacy },
] as const;

export default function SiteFooter() {
  return (
    // One compact row on phones, kept clear of the home indicator.
    <footer className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-[0.8125rem] text-[#606266] md:justify-between md:px-6 md:py-4 md:text-sm lg:px-8">
      <p>© Setter</p>
      <nav aria-label="Legal" className="flex items-center md:gap-2">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-11 items-center px-2 transition-colors duration-150 active:text-[#101011] [@media(hover:hover)]:hover:text-[#101011]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
