import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import surface from "@/components/ui/brandSurface.module.css";
import type { LegalBlock, LegalDocument } from "@/lib/legal/types";
import LegalBlockView from "./LegalBlockView";

interface LegalDocumentPageProps {
  document: LegalDocument;
}

function blockKey(block: LegalBlock, index: number): string {
  return `${block.type}-${index}`;
}

// Shared layout for the legal pages: site header and footer around a single
// reading column.
export default function LegalDocumentPage({
  document,
}: LegalDocumentPageProps) {
  return (
    <div className={`${surface.surface} flex min-h-dvh flex-col`}>
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8 md:px-6 md:pb-24 md:pt-14">
        <article className="text-[1.0625rem] leading-[1.6] text-[#606266]">
          <h1 className="text-balance text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] text-[#101011] md:text-5xl">
            {document.title}
          </h1>

          {document.intro.length > 0 && (
            <div className="mt-6 space-y-4 md:mt-8">
              {document.intro.map((block, index) => (
                <LegalBlockView key={blockKey(block, index)} block={block} />
              ))}
            </div>
          )}

          {document.sections.map((section, sectionIndex) => (
            <section key={section.heading} className="mt-10 md:mt-12">
              <h2 className="text-xl font-semibold tracking-[-0.015em] text-[#101011] md:text-2xl">
                {sectionIndex + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-4">
                {section.blocks.map((block, index) => (
                  <LegalBlockView key={blockKey(block, index)} block={block} />
                ))}
              </div>
            </section>
          ))}

          {document.footer.length > 0 && (
            <div className="mt-12 border-t border-[#F0F2F6] pt-6 text-sm">
              {document.footer.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
