import { redirect } from "next/navigation";

// Comment automations now live on the Instagram tab. This keeps old links
// working.
export default function SettingsCommentAutomationsPage() {
  redirect("/settings/socials#comment-automations");
}
