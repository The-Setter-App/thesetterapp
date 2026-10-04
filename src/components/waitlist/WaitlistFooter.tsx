const LEGAL_LINKS = [
  {
    label: "Terms",
    href: "https://thesetter.app/legal-pages/terms-and-conditions",
  },
  {
    label: "Privacy",
    href: "https://thesetter.app/legal-pages/privacy-policy",
  },
] as const;

export default function WaitlistFooter() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-sm text-[#606266] md:flex-row md:px-6 lg:px-8">
      <p>© Setter</p>
      <nav aria-label="Legal" className="flex items-center gap-2">
        {LEGAL_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center px-2 transition-colors duration-150 active:text-[#101011] [@media(hover:hover)]:hover:text-[#101011]"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
