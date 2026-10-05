// Placeholders shown while a settings tab loads. Every tab is built from the
// same parts (a heading, a line of explanation, a card of rows), so one
// skeleton with a different row count stands in for each of them.

const PULSE = "animate-pulse rounded-full bg-[#F4F5F8]";

interface SettingsSectionSkeletonProps {
  rows: number;
  titleWidthClass?: string;
}

function SettingsSectionSkeleton({
  rows,
  titleWidthClass = "w-40",
}: SettingsSectionSkeletonProps) {
  return (
    <div>
      <div
        className={`h-6 animate-pulse rounded-full bg-[#ECE9FF] ${titleWidthClass}`}
      />
      <div className={`mt-2.5 h-4 w-80 max-w-full ${PULSE}`} />
      <div className="mt-4 overflow-hidden rounded-3xl border border-[#F0F2F6] bg-white shadow-sm">
        {Array.from({ length: rows }, (_, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
            key={index}
            className="flex items-center justify-between gap-4 border-b border-[#F0F2F6] px-5 py-4 last:border-b-0 md:px-6"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#F3F0FF]" />
              <div className="space-y-2">
                <div className={`h-3.5 w-40 ${PULSE}`} />
                <div className={`h-3 w-56 max-w-full ${PULSE}`} />
              </div>
            </div>
            <div className={`h-9 w-20 shrink-0 ${PULSE}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SettingsContentSkeletonProps {
  sections: SettingsSectionSkeletonProps[];
  label: string;
}

function SettingsContentSkeleton({
  sections,
  label,
}: SettingsContentSkeletonProps) {
  return (
    <div aria-busy="true" className="space-y-10">
      <span className="sr-only">{label}</span>
      {sections.map((section, index) => (
        <SettingsSectionSkeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders that never reorder.
          key={index}
          {...section}
        />
      ))}
    </div>
  );
}

export function SettingsProfileContentSkeleton() {
  return (
    <SettingsContentSkeleton
      label="Loading account settings"
      sections={[{ rows: 3, titleWidthClass: "w-32" }]}
    />
  );
}

export function SettingsIntegrationContentSkeleton() {
  return (
    <SettingsContentSkeleton
      label="Loading integrations"
      sections={[{ rows: 1, titleWidthClass: "w-36" }]}
    />
  );
}

export function SettingsSocialsContentSkeleton() {
  return (
    <SettingsContentSkeleton
      label="Loading Instagram settings"
      sections={[
        { rows: 2, titleWidthClass: "w-44" },
        { rows: 2, titleWidthClass: "w-52" },
        { rows: 2, titleWidthClass: "w-40" },
      ]}
    />
  );
}

export function SettingsTagsContentSkeleton() {
  return (
    <SettingsContentSkeleton
      label="Loading pipeline settings"
      sections={[{ rows: 6, titleWidthClass: "w-32" }]}
    />
  );
}

export function SettingsTeamContentSkeleton() {
  return (
    <SettingsContentSkeleton
      label="Loading team settings"
      sections={[
        { rows: 3, titleWidthClass: "w-28" },
        { rows: 2, titleWidthClass: "w-40" },
      ]}
    />
  );
}
