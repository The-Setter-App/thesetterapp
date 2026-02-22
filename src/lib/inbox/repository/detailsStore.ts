import {
  CONVERSATIONS_COLLECTION,
  getInboxDb,
} from "@/lib/inbox/repository/core";
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
  const db = await getInboxDb();

  const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne(
    { id: conversationId, ownerEmail },
    {
      projection: {
        notes: 1,
        paymentDetails: 1,
        timelineEvents: 1,
        contactDetails: 1,
        tagIds: 1,
      },
    },
  );

  if (!doc) return null;

  const notes =
    typeof (doc as { notes?: unknown }).notes === "string"
      ? (doc as { notes?: string }).notes || ""
      : "";
  const payment =
    (doc as { paymentDetails?: Partial<PaymentDetails> }).paymentDetails || {};
  const rawTimeline = (doc as { timelineEvents?: unknown }).timelineEvents;
  const contact =
    (doc as { contactDetails?: Partial<ConversationContactDetails> })
      .contactDetails || {};
  const tagIdsValue = (doc as { tagIds?: string[] }).tagIds;
  const tagIds = Array.isArray(tagIdsValue)
    ? normalizeConversationTagIds(tagIdsValue)
    : [];
  const timelineEvents: ConversationTimelineEvent[] = Array.isArray(rawTimeline)
    ? rawTimeline
        .map((event) => {
          const e = event as Partial<ConversationTimelineEvent>;
          if (
            typeof e.id !== "string" ||
            e.type !== "status_update" ||
            typeof e.status !== "string" ||
            typeof e.title !== "string" ||
            typeof e.sub !== "string" ||
            typeof e.timestamp !== "string"
          ) {
            return null;
          }
          return e as ConversationTimelineEvent;
        })
        .filter((event): event is ConversationTimelineEvent => event !== null)
    : [];

  return {
    notes,
    paymentDetails: {
      amount:
        typeof payment.amount === "string"
          ? payment.amount
          : DEFAULT_PAYMENT_DETAILS.amount,
      paymentMethod:
        typeof payment.paymentMethod === "string"
          ? payment.paymentMethod
          : DEFAULT_PAYMENT_DETAILS.paymentMethod,
      payOption:
        typeof payment.payOption === "string"
          ? payment.payOption
          : DEFAULT_PAYMENT_DETAILS.payOption,
      paymentFrequency:
        typeof payment.paymentFrequency === "string"
          ? payment.paymentFrequency
          : DEFAULT_PAYMENT_DETAILS.paymentFrequency,
      setterPaid:
        payment.setterPaid === "Yes"
          ? "Yes"
          : DEFAULT_PAYMENT_DETAILS.setterPaid,
      closerPaid:
        payment.closerPaid === "Yes"
          ? "Yes"
          : DEFAULT_PAYMENT_DETAILS.closerPaid,
      paymentNotes:
        typeof payment.paymentNotes === "string"
          ? payment.paymentNotes
          : DEFAULT_PAYMENT_DETAILS.paymentNotes,
    },
    timelineEvents,
    contactDetails: {
      phoneNumber:
        typeof contact.phoneNumber === "string"
          ? contact.phoneNumber
          : DEFAULT_CONTACT_DETAILS.phoneNumber,
      email:
        typeof contact.email === "string"
          ? contact.email
          : DEFAULT_CONTACT_DETAILS.email,
    },
    tagIds,
  };
}

export async function updateConversationDetails(
  conversationId: string,
  ownerEmail: string,
  details: Partial<ConversationDetails>,
): Promise<void> {
  const db = await getInboxDb();

  const setPayload: Record<string, unknown> = {};

  if (typeof details.notes === "string") {
    setPayload.notes = details.notes;
  }

  if (details.paymentDetails) {
    const payment = details.paymentDetails;
    if (typeof payment.amount === "string")
      setPayload["paymentDetails.amount"] = payment.amount;
    if (typeof payment.paymentMethod === "string")
      setPayload["paymentDetails.paymentMethod"] = payment.paymentMethod;
    if (typeof payment.payOption === "string")
      setPayload["paymentDetails.payOption"] = payment.payOption;
    if (typeof payment.paymentFrequency === "string")
      setPayload["paymentDetails.paymentFrequency"] = payment.paymentFrequency;
    if (payment.setterPaid === "Yes" || payment.setterPaid === "No")
      setPayload["paymentDetails.setterPaid"] = payment.setterPaid;
    if (payment.closerPaid === "Yes" || payment.closerPaid === "No")
      setPayload["paymentDetails.closerPaid"] = payment.closerPaid;
    if (typeof payment.paymentNotes === "string")
      setPayload["paymentDetails.paymentNotes"] = payment.paymentNotes;
  }

  if (Array.isArray(details.timelineEvents)) {
    setPayload.timelineEvents = details.timelineEvents;
  }

  if (details.contactDetails) {
    const contact = details.contactDetails;
    if (typeof contact.phoneNumber === "string")
      setPayload["contactDetails.phoneNumber"] = contact.phoneNumber;
    if (typeof contact.email === "string")
      setPayload["contactDetails.email"] = contact.email;
  }

  if (Array.isArray(details.tagIds)) {
    setPayload.tagIds = normalizeConversationTagIds(details.tagIds);
  }

  if (Object.keys(setPayload).length === 0) return;

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne({ id: conversationId, ownerEmail }, { $set: setPayload });
}

export async function addStatusTimelineEvent(
  conversationId: string,
  ownerEmail: string,
  status: StatusType,
): Promise<void> {
  const db = await getInboxDb();

  const timestamp = new Date().toISOString();
  const event: ConversationTimelineEvent = {
    id: `status_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "status_update",
    status,
    title: status,
    sub: `Status changed to ${status}`,
    timestamp,
  };

  await db
    .collection(CONVERSATIONS_COLLECTION)
    .updateOne({ id: conversationId, ownerEmail }, {
      $push: { timelineEvents: event },
    } as Record<string, unknown>);
}
