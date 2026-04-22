"use client";

import { Badge } from "@/components/ui/Badge";
import type { TagRow } from "@/types/tags";

interface TagsSettingsSourceBadgeProps {
  source: TagRow["source"];
}

export default function TagsSettingsSourceBadge({
  source,
}: TagsSettingsSourceBadgeProps) {
  return source === "Default" ? (
    <Badge
      variant="secondary"
      className="bg-[rgba(135,113,255,0.1)] text-[#8771FF]"
    >
      Default
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-[#F0F2F6] bg-white text-[#606266]"
    >
      Custom
    </Badge>
  );
}