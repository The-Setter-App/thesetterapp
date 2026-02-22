import { type NextRequest, NextResponse } from "next/server";
import {
  MAX_CONVERSATION_TAGS,
  sanitizeConversationTagIds,
} from "@/lib/inbox/tagValidation";
import {
  getConversationDetails,
  updateConversationDetails,
} from "@/lib/inboxRepository";
import { listWorkspaceAssignableTags } from "@/lib/tagsRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";
import type { ConversationDetails } from "@/types/inbox";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]+$/;

function hasValidPhoneDigits(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { recipientId: conversationId } = await context.params;
    const details = await getConversationDetails(
      conversationId,
      workspaceOwnerEmail,
    );

    return NextResponse.json(
      {
        details: details ?? {
          notes: "",
          paymentDetails: {
            amount: "",
            paymentMethod: "Fanbasis",
            payOption: "One Time",
            paymentFrequency: "One Time",
            setterPaid: "No",
            closerPaid: "No",
            paymentNotes: "",
          },
          timelineEvents: [],
          contactDetails: {
            phoneNumber: "",
            email: "",
          },
          tagIds: [],
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[InboxDetailsAPI] Failed to get details:", error);
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { recipientId: conversationId } = await context.params;
    const body = (await request.json()) as Partial<ConversationDetails>;
    const nextBody: Partial<ConversationDetails> = { ...body };

    if (typeof nextBody.notes === "string" && nextBody.notes.length > 4000) {
      return NextResponse.json({ error: "Notes too long" }, { status: 400 });
    }

    if (nextBody.contactDetails) {
      const { email, phoneNumber } = nextBody.contactDetails;
      if (
        typeof email === "string" &&
        email.trim().length > 0 &&
        !EMAIL_REGEX.test(email.trim())
      ) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 },
        );
      }
      if (
        typeof phoneNumber === "string" &&
        phoneNumber.trim().length > 0 &&
        (!PHONE_REGEX.test(phoneNumber.trim()) ||
          !hasValidPhoneDigits(phoneNumber))
      ) {
        return NextResponse.json(
          { error: "Invalid phone number format" },
          { status: 400 },
        );
      }
    }

    if (nextBody.paymentDetails) {
      const { amount } = nextBody.paymentDetails;
      if (typeof amount === "string" && amount.trim().length > 0) {
        const numeric = Number.parseFloat(amount.replace(/[^0-9.]/g, ""));
        if (!Number.isFinite(numeric)) {
          return NextResponse.json(
            { error: "Amount must be numeric" },
            { status: 400 },
          );
        }
      }
    }

    if (nextBody.timelineEvents && !Array.isArray(nextBody.timelineEvents)) {
      return NextResponse.json(
        { error: "Timeline events must be an array" },
        { status: 400 },
      );
    }

    if (nextBody.tagIds !== undefined) {
      if (
        !Array.isArray(nextBody.tagIds) ||
        nextBody.tagIds.some((tagId) => typeof tagId !== "string")
      ) {
        return NextResponse.json(
          { error: "Tag ids must be an array of strings" },
          { status: 400 },
        );
      }

      const assignableTags =
        await listWorkspaceAssignableTags(workspaceOwnerEmail);
      const sanitizedTagIds = sanitizeConversationTagIds(
        nextBody.tagIds,
        assignableTags,
      );
      if (sanitizedTagIds.length > MAX_CONVERSATION_TAGS) {
        return NextResponse.json(
          {
            error: `A conversation can have up to ${MAX_CONVERSATION_TAGS} tags.`,
          },
          { status: 400 },
        );
      }

      nextBody.tagIds = sanitizedTagIds;
    }

    await updateConversationDetails(
      conversationId,
      workspaceOwnerEmail,
      nextBody,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[InboxDetailsAPI] Failed to update details:", error);
    return NextResponse.json(
      { error: "Failed to update details" },
      { status: 500 },
    );
  }
}
