export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-white text-[#101011]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-screen border-r border-[#F0F2F6] bg-white">
          <div className="flex h-full flex-col p-4 md:p-6">
            <div className="mb-4 rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] px-4 py-3">
              <div className="h-3 w-16 animate-pulse rounded bg-[#E8E9EE]" />
              <div className="mt-2 h-4 w-36 animate-pulse rounded bg-[#E8E9EE]" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-xl border border-[#F0F2F6] bg-[#FAFAFC]" />
              ))}
            </div>
          </div>
        </aside>

        <section className="px-4 py-6 md:px-8 md:py-8 lg:px-10">
          <header className="mb-6 flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-[#E8E9EE]" />
            <div>
              <div className="h-8 w-36 animate-pulse rounded bg-[#E8E9EE]" />
              <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#E8E9EE]" />
            </div>
          </header>

          <div className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
            <div className="border-b border-[#F0F2F6] px-6 py-6 md:px-8">
              <div className="mb-2 h-6 w-20 animate-pulse rounded-full bg-[#F3F0FF]" />
              <div className="h-6 w-56 animate-pulse rounded bg-[#E8E9EE]" />
              <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#E8E9EE]" />
            </div>
            <div className="space-y-4 px-6 py-6 md:px-8">
              <div className="h-16 animate-pulse rounded-2xl border border-[#F0F2F6] bg-[#FAFAFC]" />
              <div className="h-16 animate-pulse rounded-2xl border border-[#F0F2F6] bg-[#FAFAFC]" />
              <div className="h-16 animate-pulse rounded-2xl border border-[#F0F2F6] bg-[#FAFAFC]" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
