import { type NextRequest, NextResponse } from "next/server";
import {
  getConversationDetails,
  updateConversationDetails,
} from "@/lib/inboxRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";
import type { ConversationDetails, ConversationDetailsPatchRequest } from "@/types/inbox";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]+$/;

function hasValidPhoneDigits(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16;
}

function isClientAbortError(
  error: Error | { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  const code = "code" in error ? error.code : undefined;
  if (code === "ECONNRESET") return true;
  const message =
    typeof error.message === "string" ? error.message.toLowerCase() : "";
  return message.includes("aborted");
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
    const body = (await request.json()) as ConversationDetailsPatchRequest;
    const nextBody: Partial<ConversationDetails> = {
      notes: body.notes,
      paymentDetails: body.paymentDetails,
      timelineEvents: body.timelineEvents,
      contactDetails: body.contactDetails,
    };

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

    const result = await updateConversationDetails(
      conversationId,
      workspaceOwnerEmail,
      nextBody,
      { updatedAtByField: body.updatedAtByField },
    );

    return NextResponse.json({ ok: true, applied: result.applied });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (
      isClientAbortError(
        error as Error | { code?: string; message?: string } | null | undefined,
      )
    ) {
      return new NextResponse(null, { status: 204 });
    }
    console.error("[InboxDetailsAPI] Failed to update details:", error);
    return NextResponse.json(
      { error: "Failed to update details" },
      { status: 500 },
    );
  }
}
