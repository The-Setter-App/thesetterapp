export default function SidebarHeader() {
  return (
    <div className="sticky top-0 z-20 border-b border-[#F0F2F6] bg-white px-4 py-4 md:px-6 md:py-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#101011] md:text-2xl">
          Inbox
        </h2>
      </div>
      <p className="text-xs text-[#606266] md:text-sm">
        Your unified chat workspace.
      </p>
    </div>
  );
}
