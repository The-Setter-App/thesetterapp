import { redirect } from "next/navigation";

// Blocked accounts now live on the Instagram tab. This keeps old links
// working.
export default function SettingsBlockedUsersPage() {
  redirect("/settings/socials#blocked-accounts");
}
