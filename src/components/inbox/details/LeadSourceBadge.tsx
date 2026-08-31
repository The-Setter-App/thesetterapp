import { LuMegaphone, LuTag } from "react-icons/lu";
import type { LeadSource } from "@/types/inbox";

interface LeadSourceBadgeProps {
  leadSource?: LeadSource;
}

function getLabel(leadSource: LeadSource): string {
  switch (leadSource.type) {
    case "story_reply":
      return "Replied to a story";
    case "story_mention":
      return "Mentioned in a story";
    case "ad_referral":
      return leadSource.adTitle
        ? `From ad: ${leadSource.adTitle}`
        : "From an ad";
    default:
      return "Unknown source";
  }
}

export default function LeadSourceBadge({ leadSource }: LeadSourceBadgeProps) {
  if (!leadSource) return null;

  const isAd = leadSource.type === "ad_referral";
  const linkUrl = leadSource.storyUrl || leadSource.adPhotoUrl;
  const Icon = isAd ? LuMegaphone : LuTag;
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0 text-[#8771FF]" />
      <span className="truncate">{getLabel(leadSource)}</span>
    </>
  );
  const className =
    "mt-3 flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#606266] shadow-sm";

  if (!linkUrl) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:bg-[#F8F7FF]`}
    >
      {content}
    </a>
  );
}
