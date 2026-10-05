import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";
import { PAGE_GUTTER_CLASS } from "@/components/layout/pageGutter";
import {
  SettingsIntegrationContentSkeleton,
  SettingsProfileContentSkeleton,
  SettingsSocialsContentSkeleton,
  SettingsTagsContentSkeleton,
  SettingsTeamContentSkeleton,
} from "@/components/settings/SettingsPageSkeletons";
import surface from "@/components/ui/brandSurface.module.css";

export type SettingsSkeletonVariant =
  | "profile"
  | "integration"
  | "socials"
  | "tags"
  | "team";

export function resolveSettingsSkeletonVariant(
  pathname: string | null | undefined,
): SettingsSkeletonVariant {
  switch (pathname) {
    case "/settings/integration":
      return "integration";
    case "/settings/socials":
      return "socials";
    case "/settings/tags":
      return "tags";
    case "/settings/team":
      return "team";
    default:
      return "profile";
  }
}

const CONTENT_SKELETONS: Record<
  SettingsSkeletonVariant,
  () => React.ReactNode
> = {
  profile: SettingsProfileContentSkeleton,
  integration: SettingsIntegrationContentSkeleton,
  socials: SettingsSocialsContentSkeleton,
  tags: SettingsTagsContentSkeleton,
  team: SettingsTeamContentSkeleton,
};

interface SettingsLayoutSkeletonProps {
  variant?: SettingsSkeletonVariant;
}

// The whole settings page while its layout loads: title, tabs and content.
export default function SettingsLayoutSkeleton({
  variant = "profile",
}: SettingsLayoutSkeletonProps) {
  const ContentSkeleton = CONTENT_SKELETONS[variant];

  return (
    <div
      className={`${surface.surface} flex h-full min-h-0 flex-col overflow-hidden text-[#101011]`}
    >
      <PageHeaderSkeleton
        divider={false}
        titleWidthClass="w-28"
        descriptionWidthClass="w-[360px]"
      />
      <div className={`${PAGE_GUTTER_CLASS} pb-4 pt-4`}>
        <div className="h-11 w-full max-w-md animate-pulse rounded-full bg-[#F4F5F8]" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden border-t border-[#F0F2F6]">
        <div className={`${PAGE_GUTTER_CLASS} w-full max-w-5xl pt-6`}>
          <ContentSkeleton />
        </div>
      </div>
    </div>
  );
}
