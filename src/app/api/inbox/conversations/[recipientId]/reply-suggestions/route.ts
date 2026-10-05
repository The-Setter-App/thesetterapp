import { type NextRequest, NextResponse } from "next/server";
import { AiConfigurationError, AiUpstreamError } from "@/lib/ai/chatCompletion";
import { getCalendlyConnectionState } from "@/lib/calendly/service";
import { generateReplySuggestions } from "@/lib/inbox/replySuggestions";
import {
  findConversationById,
  getConversationDetails,
  getMessagesPageFromDb,
} from "@/lib/inboxRepository";
import { getReplyPlaybook } from "@/lib/replyPlaybookRepository";
import { EMPTY_TAG_DESCRIPTION } from "@/lib/tags/config";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";
import type { LeadSource } from "@/types/inbox";
import {
  isReplySuggestionAdjustment,
  type ReplySuggestionAdjustment,
  type ReplySuggestionsResponse,
} from "@/types/replySuggestions";

export const dynamic = "force-dynamic";

// How much of the conversation the drafts are based on.
const SUGGESTION_MESSAGE_LIMIT = 40;

const NO_STORE = { "Cache-Control": "private, no-store" };

const LEAD_SOURCE_LABELS: Record<LeadSource["type"], string> = {
  story_reply: "replied to a story",
  story_mention: "mentioned the account in their story",
  ad_referral: "came in from an ad",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

// The body is optional. When present it may only carry a known adjustment.
async function readAdjustment(
  request: NextRequest,
): Promise<ReplySuggestionAdjustment | null | "invalid"> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return null;

  const adjustment: unknown = (body as { adjustment?: unknown }).adjustment;
  if (adjustment === undefined || adjustment === null) return null;
  return isReplySuggestionAdjustment(adjustment) ? adjustment : "invalid";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();
    const { recipientId: conversationId } = await context.params;
    if (!conversationId?.trim()) {
      return errorResponse("Conversation id is required.", 400);
    }

    const adjustment = await readAdjustment(request);
    if (adjustment === "invalid") {
      return errorResponse("Unknown adjustment.", 400);
    }

    const conversation = await findConversationById(
      conversationId,
      workspaceOwnerEmail,
    );
    if (!conversation?.id) {
      return errorResponse("Conversation not found.", 404);
    }

    const [page, details, statuses, playbook, calendlyConnection] =
      await Promise.all([
        getMessagesPageFromDb(
          conversation.id,
          workspaceOwnerEmail,
          SUGGESTION_MESSAGE_LIMIT,
        ),
        getConversationDetails(conversation.id, workspaceOwnerEmail),
        listWorkspaceAssignableTags(workspaceOwnerEmail),
        getReplyPlaybook(workspaceOwnerEmail),
        // Booking is optional context; a failed lookup must not block drafts.
        getCalendlyConnectionState(workspaceOwnerEmail).catch(() => null),
      ]);

    if (page.messages.length === 0) {
      return errorResponse("There are no messages to reply to yet.", 422);
    }

    const status = statuses.find((tag) => tag.name === conversation.status);
    const suggestions = await generateReplySuggestions({
      messages: page.messages,
      leadName: conversation.name?.replace(/^@/, "").trim() || "the lead",
      status: status
        ? {
            name: status.name,
            description:
              status.description === EMPTY_TAG_DESCRIPTION
                ? ""
                : status.description,
          }
        : null,
      leadSource: conversation.leadSource
        ? LEAD_SOURCE_LABELS[conversation.leadSource.type]
        : null,
      notes: details?.notes ?? "",
      playbook,
      canSendBookingLink: Boolean(calendlyConnection),
      adjustment,
    });

    if (suggestions.length === 0) {
      return errorResponse(
        "Could not draft a reply this time. Try again.",
        502,
      );
    }

    const payload: ReplySuggestionsResponse = { suggestions };
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AccessError) {
      return errorResponse(error.message, error.status);
    }
    if (error instanceof AiConfigurationError) {
      console.error("[ReplySuggestionsAPI] AI is not configured.");
      return errorResponse("Suggested replies are not available yet.", 503);
    }
    if (error instanceof AiUpstreamError && error.isSetupProblem) {
      console.error(
        "[ReplySuggestionsAPI] The AI provider rejected the request. Check that NVIDIA_MODEL is a model the provider still serves and that NVIDIA_API_KEY is valid.",
        error.message,
      );
      return errorResponse("Suggested replies are unavailable right now.", 503);
    }
    if (error instanceof AiUpstreamError) {
      console.error("[ReplySuggestionsAPI] AI request failed:", error.message);
      return errorResponse(
        "Could not draft a reply this time. Try again.",
        502,
      );
    }
    console.error("[ReplySuggestionsAPI] Failed to draft replies:", error);
    return errorResponse("Could not draft a reply this time. Try again.", 500);
  }
}
