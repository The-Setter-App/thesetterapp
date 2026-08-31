import type { LeadSource } from "@/types/inbox";

// Shapes confirmed against Meta's Instagram Platform webhook examples
// (developers.facebook.com/documentation/instagram-platform/webhooks/examples):
//   - Story reply:      message.reply_to.story = { url, id }
//   - Story mention:    message.attachments[].type === "story_mention"
//   - Ad / "Send Message" button referral: message.referral = {
//       ref, ad_id, source, type, ads_context_data: { ad_title, photo_url, video_url }
//     }
interface WebhookReplyToStory {
  url?: string;
  id?: string;
}

interface WebhookAttachment {
  type?: string;
  payload?: { url?: string };
}

interface WebhookReferral {
  ads_context_data?: {
    ad_title?: string;
    photo_url?: string;
  };
}

interface WebhookMessageForLeadSource {
  reply_to?: { story?: WebhookReplyToStory };
  attachments?: unknown[];
  referral?: WebhookReferral;
}

export function extractLeadSourceFromWebhookMessage(
  msg: WebhookMessageForLeadSource,
  capturedAt: string,
): LeadSource | null {
  const replyStory = msg.reply_to?.story;
  if (replyStory?.url || replyStory?.id) {
    return {
      type: "story_reply",
      storyUrl: replyStory.url,
      capturedAt,
    };
  }

  const storyMention = (
    msg.attachments as WebhookAttachment[] | undefined
  )?.find((attachment) => attachment?.type === "story_mention");
  if (storyMention) {
    return {
      type: "story_mention",
      storyUrl: storyMention.payload?.url,
      capturedAt,
    };
  }

  const referral = msg.referral;
  if (referral?.ads_context_data) {
    return {
      type: "ad_referral",
      adTitle: referral.ads_context_data.ad_title,
      adPhotoUrl: referral.ads_context_data.photo_url,
      capturedAt,
    };
  }

  return null;
}
