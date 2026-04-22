"use client";

import PageHeaderSkeleton from "@/components/layout/PageHeaderSkeleton";
import {
  SettingsIntegrationContentSkeleton,
  SettingsProfileContentSkeleton,
  SettingsSocialsContentSkeleton,
  SettingsTagsContentSkeleton,
  SettingsTeamContentSkeleton,
} from "@/components/settings/SettingsPageSkeletons";

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
    case "/settings/profile":
      return "profile";
    default:
      return "profile";
  }
}

const sidebarItemKeys = [
  "profile",
  "team",
  "socials",
  "tags",
  "integration",
] as const;

function SettingsSidebarSkeleton() {
  return (
    <aside className="h-auto border-r border-[#F0F2F6] bg-white md:h-full">
      <div className="flex h-full flex-col p-4 md:p-6">
        <nav className="flex gap-2 overflow-x-auto md:block md:space-y-2 md:overflow-visible">
          {sidebarItemKeys.map((itemKey, index) => (
            <div
              key={itemKey}
              className={`h-12 min-w-[120px] animate-pulse rounded-xl border px-4 md:w-full ${
                index === 0
                  ? "border-[#D8D2FF] bg-[#F3F0FF]"
                  : "border-[#F0F2F6] bg-white"
              }`}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function renderSettingsSkeletonContent(variant: SettingsSkeletonVariant) {
  switch (variant) {
    case "integration":
      return <SettingsIntegrationContentSkeleton />;
    case "socials":
      return <SettingsSocialsContentSkeleton />;
    case "tags":
      return <SettingsTagsContentSkeleton />;
    case "team":
      return <SettingsTeamContentSkeleton />;
    default:
      return <SettingsProfileContentSkeleton />;
  }
}

export default function SettingsLayoutSkeleton({
  variant = "profile",
}: {
  variant?: SettingsSkeletonVariant;
}) {
  return (
    <div className="flex h-full min-h-screen flex-col overflow-hidden bg-white text-[#101011]">
      <PageHeaderSkeleton
        titleWidthClass="w-28"
        descriptionWidthClass="w-[360px]"
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="shrink-0 md:h-full">
          <SettingsSidebarSkeleton />
        </div>

        <section className="min-h-0 overflow-y-auto bg-white">
          <div className="w-full px-4 py-6 md:px-8 md:py-8 lg:px-10">
            {renderSettingsSkeletonContent(variant)}
          </div>
        </section>
      </div>
    </div>
  );
}
