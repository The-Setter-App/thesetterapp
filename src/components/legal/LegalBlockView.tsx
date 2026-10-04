import type { LegalBlock, LegalInline } from "@/lib/legal/types";

interface LegalBlockViewProps {
  block: LegalBlock;
}

function renderInline(part: LegalInline, index: number) {
  if (typeof part === "string") return part;

  return (
    <a
      key={`${part.email}-${index}`}
      href={`mailto:${part.email}`}
      className="font-medium text-[#8771FF] underline underline-offset-2 transition-colors duration-150 active:text-[#6d5ed6] [@media(hover:hover)]:hover:text-[#6d5ed6]"
    >
      {part.email}
    </a>
  );
}

export default function LegalBlockView({ block }: LegalBlockViewProps) {
  switch (block.type) {
    case "paragraph":
      return <p>{block.content.map(renderInline)}</p>;
    case "subheading":
      return (
        <h3 className="pt-2 text-base font-semibold text-[#101011]">
          {block.text}
        </h3>
      );
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-5 marker:text-[#8771FF]">
          {block.items.map((item) => (
            <li key={item.text}>
              {item.label && (
                <span className="font-semibold text-[#101011]">
                  {item.label}:{" "}
                </span>
              )}
              {item.text}
            </li>
          ))}
        </ul>
      );
  }
}
