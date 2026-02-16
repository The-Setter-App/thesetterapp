export const REQUIRED_INSTAGRAM_SCOPES = [
  'business_management',
  'pages_manage_metadata',
  'pages_messaging',
  'pages_read_engagement',
  'pages_show_list',
  'pages_utility_messaging',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_comments',
  'instagram_manage_messages',
] as const;

export type RequiredInstagramScope = (typeof REQUIRED_INSTAGRAM_SCOPES)[number];
