import { CONVERSATIONS_COLLECTION, getInboxSupabase } from "@/lib/inbox/repository/core";
import { normalizeConversationTagIds } from "@/lib/inbox/tagValidation";
import type {
  ConversationContactDetails,
  ConversationDetails,
  ConversationTimelineEvent,
  PaymentDetails,
  StatusType,
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

  const { data } = await supabase
    .from(CONVERSATIONS_COLLECTION)
    .select("notes,payment_details,timeline_events,contact_details,tag_ids")
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    notes: string | null;
    payment_details: Partial<PaymentDetails> | null;
    timeline_events: ConversationTimelineEvent[] | null;
    contact_details: Partial<ConversationContactDetails> | null;
    tag_ids: string[] | null;
  };

  const payment = row.payment_details ?? {};
  const contact = row.contact_details ?? {};
  const timelineEvents = Array.isArray(row.timeline_events) ? row.timeline_events : [];

  return {
    notes: row.notes ?? "",
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
    tagIds: Array.isArray(row.tag_ids) ? normalizeConversationTagIds(row.tag_ids) : [],
  };
}

export async function updateConversationDetails(
  conversationId: string,
  ownerEmail: string,
  details: Partial<ConversationDetails>,
): Promise<void> {
  const supabase = getInboxSupabase();

  const updates: {
    notes?: string;
    payment_details?: Partial<PaymentDetails>;
    timeline_events?: ConversationTimelineEvent[];
    contact_details?: Partial<ConversationContactDetails>;
    tag_ids?: string[];
    updated_at?: string;
  } = {};

  if (typeof details.notes === "string") {
    updates.notes = details.notes;
  }

  if (details.paymentDetails) {
    updates.payment_details = details.paymentDetails;
  }

  if (Array.isArray(details.timelineEvents)) {
    updates.timeline_events = details.timelineEvents;
  }

  if (details.contactDetails) {
    updates.contact_details = details.contactDetails;
  }

  if (Array.isArray(details.tagIds)) {
    updates.tag_ids = normalizeConversationTagIds(details.tagIds);
  }

  if (Object.keys(updates).length === 0) return;

  updates.updated_at = new Date().toISOString();

  await supabase
    .from(CONVERSATIONS_COLLECTION)
    .update(updates)
    .eq("id", conversationId)
    .eq("owner_email", ownerEmail);
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
