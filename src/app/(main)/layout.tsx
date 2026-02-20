import Sidebar from "@/components/layout/Sidebar";
import { requireCurrentUser } from "@/lib/currentUser";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireCurrentUser();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar role={user.role} />
      <div className="ml-16 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
