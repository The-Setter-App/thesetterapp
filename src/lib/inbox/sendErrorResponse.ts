import { NextResponse } from "next/server";
import { GraphApiRequestError } from "@/lib/graphApi";
import { MESSAGING_WINDOW_CLOSED_ERROR_CODE } from "@/lib/inbox/messagingWindow";

// The response for a message Instagram would not deliver. A closed reply
// window is reported as such, with a code the inbox recognises; anything
// else is a plain failure the user can retry.
export function toSendErrorResponse(error: unknown): NextResponse {
  if (error instanceof GraphApiRequestError && error.isOutsideMessagingWindow) {
    return NextResponse.json(
      {
        error:
          "Instagram's reply window for this lead has closed. You can message them again once they write to you.",
        code: MESSAGING_WINDOW_CLOSED_ERROR_CODE,
      },
      { status: 409 },
    );
  }

  const message = error instanceof Error ? error.message : "Failed to send";
  return NextResponse.json({ error: message }, { status: 500 });
}
