import {
  getConversationCallEvents,
  getWorkspaceCallEventById,
  getWorkspaceCallEventsByRange,
} from "@/lib/calendly/repository";
import type { WorkspaceCalendarCallEvent } from "@/types/calendly";
import { ensureCallEventPreCallAnswers } from "./service.shared";

const MAX_CALENDAR_RANGE_DAYS = 93;

function parseCalendarRange(input: { fromIso: string; toIso: string }) {
  const fromIso = input.fromIso.trim();
  const toIso = input.toIso.trim();

  if (!fromIso || !toIso) {
    throw new Error("Invalid calendar range: from and to are required.");
  }

  const from = new Date(fromIso);
  const to = new Date(toIso);

  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    throw new Error(
      "Invalid calendar range: from and to must be valid ISO datetime values.",
    );
  }
  if (from.getTime() >= to.getTime()) {
    throw new Error("Invalid calendar range: from must be earlier than to.");
  }

  const maxWindowMs = MAX_CALENDAR_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxWindowMs) {
    throw new Error(
      `Invalid calendar range: range must be ${MAX_CALENDAR_RANGE_DAYS} days or less.`,
    );
  }

  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

export async function getConversationCalls(input: {
  workspaceOwnerEmail: string;
  conversationId: string;
}) {
  return getConversationCallEvents(
    input.workspaceOwnerEmail,
    input.conversationId,
  );
}

export async function getWorkspaceCalendarCalls(input: {
  workspaceOwnerEmail: string;
  fromIso: string;
  toIso: string;
}): Promise<WorkspaceCalendarCallEvent[]> {
  const range = parseCalendarRange({
    fromIso: input.fromIso,
    toIso: input.toIso,
  });

  return getWorkspaceCallEventsByRange({
    ownerEmail: input.workspaceOwnerEmail,
    fromIso: range.fromIso,
    toIso: range.toIso,
  });
}

export async function getWorkspaceCalendarCallDetail(input: {
  workspaceOwnerEmail: string;
  eventId: string;
}): Promise<WorkspaceCalendarCallEvent | null> {
  await ensureCallEventPreCallAnswers({
    ownerEmail: input.workspaceOwnerEmail,
    eventId: input.eventId,
  });

  return getWorkspaceCallEventById({
    ownerEmail: input.workspaceOwnerEmail,
    id: input.eventId,
  });
}
