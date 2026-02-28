import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";
import { normalizeConversationTagIds } from "@/lib/inbox/tagValidation";
import type {
  ConversationContactDetails,
  ConversationDetails,
  ConversationTimelineEvent,
  PaymentDetails,
  StatusType,
  User,
} from "@/types/inbox";

const DEFAULT_PAYMENT_DETAILS: PaymentDetails = {
  amount: "",
  paymentMethod: "Fanbasis",
  payOption: "One Time",
  paymentFrequency: "One Time",
  setterPaid: "No",
  closerPaid: "No",
  paymentNotes: "",
};

const DEFAULT_CONTACT_DETAILS: ConversationContactDetails = {
  phoneNumber: "",
  email: "",
};

export async function getConversationDetails(
  conversationId: string,
  ownerEmail: string,
): Promise<ConversationDetails | null> {
  const supabase = getInboxSupabase();

  const { data, error } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("notes,payment_details,timeline_events,contact_details,tag_ids,payload")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (error) {
    throw new Error(`[InboxDetailsStore] Failed to fetch conversation details: ${error.message}`);
  }

  if (!data) return null;

  const row = data as {
    notes: string | null;
    payment_details: Partial<PaymentDetails> | null;
    timeline_events: ConversationTimelineEvent[] | null;
    contact_details: Partial<ConversationContactDetails> | null;
    tag_ids: string[] | null;
    payload: User | null;
  };

  const payload = row.payload ?? null;
  const payment = row.payment_details ?? payload?.paymentDetails ?? {};
  const contact = row.contact_details ?? payload?.contactDetails ?? {};
  const timelineEvents = Array.isArray(row.timeline_events)
    ? row.timeline_events
    : Array.isArray(payload?.timelineEvents)
      ? payload.timelineEvents
      : [];
  const normalizedTagIds = Array.isArray(row.tag_ids)
    ? normalizeConversationTagIds(row.tag_ids)
    : Array.isArray(payload?.tagIds)
      ? normalizeConversationTagIds(payload.tagIds)
      : [];

  return {
    notes: row.notes ?? payload?.notes ?? "",
    paymentDetails: {
      amount: typeof payment.amount === "string" ? payment.amount : DEFAULT_PAYMENT_DETAILS.amount,
      paymentMethod:
        typeof payment.paymentMethod === "string" ? payment.paymentMethod : DEFAULT_PAYMENT_DETAILS.paymentMethod,
      payOption: typeof payment.payOption === "string" ? payment.payOption : DEFAULT_PAYMENT_DETAILS.payOption,
      paymentFrequency:
        typeof payment.paymentFrequency === "string"
          ? payment.paymentFrequency
          : DEFAULT_PAYMENT_DETAILS.paymentFrequency,
      setterPaid: payment.setterPaid === "Yes" ? "Yes" : DEFAULT_PAYMENT_DETAILS.setterPaid,
      closerPaid: payment.closerPaid === "Yes" ? "Yes" : DEFAULT_PAYMENT_DETAILS.closerPaid,
      paymentNotes:
        typeof payment.paymentNotes === "string" ? payment.paymentNotes : DEFAULT_PAYMENT_DETAILS.paymentNotes,
    },
    timelineEvents,
    contactDetails: {
      phoneNumber:
        typeof contact.phoneNumber === "string" ? contact.phoneNumber : DEFAULT_CONTACT_DETAILS.phoneNumber,
      email: typeof contact.email === "string" ? contact.email : DEFAULT_CONTACT_DETAILS.email,
    },
    tagIds: normalizedTagIds,
  };
}

export async function updateConversationDetails(
  conversationId: string,
  ownerEmail: string,
  details: Partial<ConversationDetails>,
): Promise<void> {
  const supabase = getInboxSupabase();
  const { data: existingRow, error: fetchError } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("payload")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`[InboxDetailsStore] Failed to load existing payload: ${fetchError.message}`);
  }

  const updates: {
    notes?: string;
    payment_details?: Partial<PaymentDetails>;
    timeline_events?: ConversationTimelineEvent[];
    contact_details?: Partial<ConversationContactDetails>;
    tag_ids?: string[];
    payload?: User;
    updated_at?: string;
  } = {};
  const row = (existingRow as { payload?: User | null } | null) ?? null;
  if (!row) return;
  const existingPayload = row.payload ?? null;
  const nextPayload = existingPayload ? ({ ...existingPayload } as User) : null;

  if (typeof details.notes === "string") {
    updates.notes = details.notes;
    if (nextPayload) {
      nextPayload.notes = details.notes;
    }
  }

  if (details.paymentDetails) {
    updates.payment_details = details.paymentDetails;
    if (nextPayload) {
      nextPayload.paymentDetails = details.paymentDetails;
    }
  }

  if (Array.isArray(details.timelineEvents)) {
    updates.timeline_events = details.timelineEvents;
    if (nextPayload) {
      nextPayload.timelineEvents = details.timelineEvents;
    }
  }

  if (details.contactDetails) {
    updates.contact_details = details.contactDetails;
    if (nextPayload) {
      nextPayload.contactDetails = details.contactDetails;
    }
  }

  if (Array.isArray(details.tagIds)) {
    const normalizedTagIds = normalizeConversationTagIds(details.tagIds);
    updates.tag_ids = normalizedTagIds;
    if (nextPayload) {
      nextPayload.tagIds = normalizedTagIds;
    }
  }

  if (Object.keys(updates).length === 0) return;

  if (nextPayload) {
    updates.payload = nextPayload;
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update(updates)
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail);

  if (error) {
    throw new Error(`[InboxDetailsStore] Failed to update conversation details: ${error.message}`);
  }
}

export async function addStatusTimelineEvent(
  conversationId: string,
  ownerEmail: string,
  status: StatusType,
): Promise<void> {
  const existing = await getConversationDetails(conversationId, ownerEmail);
  if (!existing) return;

  const timestamp = new Date().toISOString();
  const event: ConversationTimelineEvent = {
    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "status_update",
    status,
    title: status,
    sub: `Status changed to ${status}`,
    timestamp,
  };

  await updateConversationDetails(conversationId, ownerEmail, {
    timelineEvents: [...existing.timelineEvents, event],
  });
}
