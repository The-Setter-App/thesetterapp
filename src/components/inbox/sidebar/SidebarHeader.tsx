export default function SidebarHeader() {
  return (
    <div className="p-4 pb-3 border-b border-gray-200">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-gray-800">
          Inbox
        </h2>
      </div>
      <p className="text-xs font-medium text-gray-400">
        Your unified chat workspace.
      </p>
    </div>
  );
}
