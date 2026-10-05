import { MESSAGING_WINDOW_CLOSED_ERROR_CODE } from "@/lib/inbox/messagingWindow";

// A send the server turned down, with the reason code it gave, if any.
export class SendRejectedError extends Error {
  code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.code = code;
  }
}

// Reads a failed send response into an error that keeps the server's reason.
export async function toSendRejectedError(
  response: Response,
  fallbackMessage: string,
): Promise<SendRejectedError> {
  const body: unknown = await response.json().catch(() => null);
  const fields =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  return new SendRejectedError(
    typeof fields.error === "string" && fields.error
      ? fields.error
      : fallbackMessage,
    typeof fields.code === "string" ? fields.code : null,
  );
}

export interface SendFailureNotice {
  title: string;
  description: string;
}

// What to tell the user about a failed send. A closed reply window is
// explained as such, because trying again cannot work; anything else gets
// the caller's general wording.
export function describeSendFailure(
  error: unknown,
  fallback: SendFailureNotice,
): SendFailureNotice {
  if (
    error instanceof SendRejectedError &&
    error.code === MESSAGING_WINDOW_CLOSED_ERROR_CODE
  ) {
    return {
      title: "Instagram's reply window has closed",
      description:
        "This lead last wrote more than 7 days ago. You can message them again once they write to you.",
    };
  }
  return fallback;
}
