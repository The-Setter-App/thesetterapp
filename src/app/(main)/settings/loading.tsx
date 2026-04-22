"use client";

import { usePathname } from "next/navigation";
import SettingsLayoutSkeleton, {
  resolveSettingsSkeletonVariant,
} from "@/components/settings/SettingsLayoutSkeleton";

export default function SettingsLoading() {
  const pathname = usePathname();

  return (
    <SettingsLayoutSkeleton
      variant={resolveSettingsSkeletonVariant(pathname)}
    />
  );
}
