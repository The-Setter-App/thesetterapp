import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCachedUser } from "@/lib/settingsCache";

export const requireCurrentSettingsUser = cache(async () => {
  const session = await getSession({ validateUser: false });
  if (!session?.email) redirect("/login");

  const user = await getCachedUser(session.email);
  if (!user) redirect("/login");

  return {
    session: {
      email: user.email,
      role: user.role,
    },
    user,
  };
});
