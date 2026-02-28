export default function LeadsLoading() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] px-4 py-6 text-[#101011] md:px-6 md:py-8 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 md:gap-6">
        <section className="rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-36 animate-pulse rounded bg-[#ECE9FF]" />
              <div className="h-4 w-64 animate-pulse rounded bg-[#F4F5F8]" />
            </div>
            <div className="h-11 w-full animate-pulse rounded-xl bg-[#F4F5F8] md:w-72" />
          </div>
        </section>

        <section className="rounded-2xl border border-[#F0F2F6] bg-white p-3 shadow-sm md:p-4">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((chip) => (
              <div key={chip} className="h-9 w-24 animate-pulse rounded-full bg-[#F3F0FF]" />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#F0F2F6] bg-white shadow-sm">
          <div className="hidden grid-cols-8 gap-4 border-b border-[#F0F2F6] px-4 py-3 md:grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((col) => (
              <div key={col} className="h-4 animate-pulse rounded bg-[#F4F5F8]" />
            ))}
          </div>

          <div className="space-y-2 p-3 md:p-4">
            {[1, 2, 3, 4, 5, 6, 7].map((row) => (
              <div
                key={row}
                className="grid grid-cols-1 gap-3 rounded-xl border border-[#F0F2F6] bg-[#FBFBFD] p-3 md:grid-cols-8 md:items-center md:gap-4"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
                  <div key={cell} className="h-4 animate-pulse rounded bg-[#ECE9FF]" />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
