import Sidebar from "@/components/layout/Sidebar";
import { requireCurrentUser } from "@/lib/currentUser";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireCurrentUser();

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex-1 ml-16">
        {children}
      </div>
    </div>
  );
}
