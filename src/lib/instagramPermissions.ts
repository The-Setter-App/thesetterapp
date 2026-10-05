// The Meta permissions asked for when an owner connects Instagram. Connecting
// fails if any is declined, so this list holds only what the app really
// uses; each one also has to be approved in Meta's App Review, which turns
// down permissions an app cannot show in use.
//
// - instagram_manage_messages: read and send Instagram direct messages.
// - instagram_basic: the Instagram account's id and username.
// - instagram_manage_comments: comment automations (reply by DM to a comment).
// - pages_show_list: find the Facebook Page the Instagram account is linked to.
// - pages_read_engagement: read that Page's linked Instagram account.
// - pages_manage_metadata: subscribe the Page to message webhooks.
// - pages_messaging: receive and send messages through the Page.
// - business_management: reach Pages owned by a business portfolio.
export const REQUIRED_INSTAGRAM_SCOPES = [
  "business_management",
  "pages_manage_metadata",
  "pages_messaging",
  "pages_read_engagement",
  "pages_show_list",
  "instagram_basic",
  "instagram_manage_comments",
  "instagram_manage_messages",
] as const;

export type RequiredInstagramScope = (typeof REQUIRED_INSTAGRAM_SCOPES)[number];
