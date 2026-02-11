import InboxSidebar from '@/components/inbox/InboxSidebar';

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden ml-5">
      <InboxSidebar />
      {children}
    </div>
  );
}