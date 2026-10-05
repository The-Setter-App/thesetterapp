// Reads the result of an Instagram connect or disconnect out of the page's
// query string and turns it into the notices shown on the Instagram tab.

type QueryValue = string | string[] | undefined;

export interface InstagramConnectionNotices {
  success: string | null;
  error: string | null;
  warning: string | null;
  // True straight after a successful connect, when messages start syncing.
  connectSuccess: boolean;
  disconnectedAccountId: string | undefined;
  // Any of these means the stored account list has just changed.
  hasConnectionState: boolean;
}

function readString(value: QueryValue): string {
  return typeof value === "string" ? value : "";
}

export function readInstagramConnectionNotices(
  params: Record<string, QueryValue>,
): InstagramConnectionNotices {
  const errorCode = readString(params.error);
  const successCode = readString(params.success);
  const warningCode = readString(params.warning);
  const disconnectedAccountId =
    readString(params.disconnectedAccountId) || undefined;
  const missingScopes = readString(params.missing).split(",").filter(Boolean);
  const connectedCount = Number.parseInt(readString(params.connectedCount), 10);

  let success: string | null = null;
  if (successCode === "disconnected") {
    success = "Instagram account disconnected.";
  } else if (successCode) {
    success =
      Number.isFinite(connectedCount) && connectedCount > 1
        ? `${connectedCount} Instagram accounts connected.`
        : "Instagram account connected.";
  }

  let error: string | null = null;
  if (errorCode === "missing_required_scopes") {
    error = `Instagram did not grant every permission Setter needs. Missing: ${missingScopes.join(", ")}.`;
  } else if (errorCode) {
    error = `Could not connect to Instagram (${errorCode}).`;
  }

  return {
    success,
    error,
    warning: warningCode
      ? "Instagram connected, but Setter could not subscribe to messages for one or more pages. Reconnect the account to try again."
      : null,
    connectSuccess: successCode === "true",
    disconnectedAccountId,
    hasConnectionState: Boolean(
      errorCode || successCode || warningCode || disconnectedAccountId,
    ),
  };
}
