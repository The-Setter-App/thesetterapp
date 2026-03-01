"use client";

import type {
  ConversationContactDetails,
  ConversationDetails,
  ConversationTimelineEvent,
  PaymentDetails,
} from "@/types/inbox";

export type ConversationDetailsPendingPatch = Partial<ConversationDetails>;

export interface ConversationDetailsCacheRecord {
  details: ConversationDetails;
  pending?: ConversationDetailsPendingPatch;
}

export interface ConversationDetailsCacheState {
  details: ConversationDetails;
  pending: ConversationDetailsPendingPatch;
}

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

function normalizePaymentDetails(
  value: Partial<PaymentDetails> | null | undefined,
): PaymentDetails {
  return {
    amount: typeof value?.amount === "string" ? value.amount : "",
    paymentMethod:
      typeof value?.paymentMethod === "string"
        ? value.paymentMethod
        : DEFAULT_PAYMENT_DETAILS.paymentMethod,
    payOption:
      typeof value?.payOption === "string"
        ? value.payOption
        : DEFAULT_PAYMENT_DETAILS.payOption,
    paymentFrequency:
      typeof value?.paymentFrequency === "string"
        ? value.paymentFrequency
        : DEFAULT_PAYMENT_DETAILS.paymentFrequency,
    setterPaid: value?.setterPaid === "Yes" ? "Yes" : "No",
    closerPaid: value?.closerPaid === "Yes" ? "Yes" : "No",
    paymentNotes:
      typeof value?.paymentNotes === "string" ? value.paymentNotes : "",
  };
}

function normalizeContactDetails(
  value: Partial<ConversationContactDetails> | null | undefined,
): ConversationContactDetails {
  return {
    phoneNumber:
      typeof value?.phoneNumber === "string"
        ? value.phoneNumber
        : DEFAULT_CONTACT_DETAILS.phoneNumber,
    email:
      typeof value?.email === "string" ? value.email : DEFAULT_CONTACT_DETAILS.email,
  };
}

function normalizeTimelineEvents(
  value: ConversationTimelineEvent[] | null | undefined,
): ConversationTimelineEvent[] {
  return Array.isArray(value) ? [...value] : [];
}

export function normalizeConversationDetails(
  value: Partial<ConversationDetails> | ConversationDetails | null | undefined,
): ConversationDetails {
  return {
    notes: typeof value?.notes === "string" ? value.notes : "",
    paymentDetails: normalizePaymentDetails(value?.paymentDetails),
    timelineEvents: normalizeTimelineEvents(value?.timelineEvents),
    contactDetails: normalizeContactDetails(value?.contactDetails),
  };
}

export function normalizeConversationDetailsPendingPatch(
  patch: ConversationDetailsPendingPatch | null | undefined,
): ConversationDetailsPendingPatch {
  const normalized: ConversationDetailsPendingPatch = {};

  if (typeof patch?.notes === "string") {
    normalized.notes = patch.notes;
  }

  if (patch?.paymentDetails) {
    normalized.paymentDetails = normalizePaymentDetails(patch.paymentDetails);
  }

  if (Array.isArray(patch?.timelineEvents)) {
    normalized.timelineEvents = normalizeTimelineEvents(patch.timelineEvents);
  }

  if (patch?.contactDetails) {
    normalized.contactDetails = normalizeContactDetails(patch.contactDetails);
  }

  return normalized;
}

function isConversationDetailsCacheRecord(
  value: ConversationDetails | ConversationDetailsCacheRecord,
): value is ConversationDetailsCacheRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "details" in value &&
    value.details !== undefined
  );
}

function paymentDetailsEqual(a: PaymentDetails, b: PaymentDetails): boolean {
  return (
    a.amount === b.amount &&
    a.paymentMethod === b.paymentMethod &&
    a.payOption === b.payOption &&
    a.paymentFrequency === b.paymentFrequency &&
    a.setterPaid === b.setterPaid &&
    a.closerPaid === b.closerPaid &&
    a.paymentNotes === b.paymentNotes
  );
}

function contactDetailsEqual(
  a: ConversationContactDetails,
  b: ConversationContactDetails,
): boolean {
  return a.phoneNumber === b.phoneNumber && a.email === b.email;
}

function timelineEventsEqual(
  a: ConversationTimelineEvent[],
  b: ConversationTimelineEvent[],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function readConversationDetailsCacheState(
  value: ConversationDetails | ConversationDetailsCacheRecord | null,
): ConversationDetailsCacheState | null {
  if (!value) return null;

  if (isConversationDetailsCacheRecord(value)) {
    return {
      details: normalizeConversationDetails(value.details),
      pending: normalizeConversationDetailsPendingPatch(value.pending),
    };
  }

  return {
    details: normalizeConversationDetails(value),
    pending: {},
  };
}

export function toConversationDetailsCacheRecord(
  state: ConversationDetailsCacheState,
): ConversationDetailsCacheRecord {
  return {
    details: normalizeConversationDetails(state.details),
    pending: normalizeConversationDetailsPendingPatch(state.pending),
  };
}

export function applyConversationDetailsLocalPatch(
  currentState: ConversationDetailsCacheState | null,
  patch: ConversationDetailsPendingPatch,
): ConversationDetailsCacheState {
  const normalizedPatch = normalizeConversationDetailsPendingPatch(patch);
  const baseDetails = currentState?.details ?? normalizeConversationDetails(null);
  const basePending = currentState?.pending ?? {};

  return {
    details: {
      notes:
        typeof normalizedPatch.notes === "string"
          ? normalizedPatch.notes
          : baseDetails.notes,
      paymentDetails: normalizedPatch.paymentDetails ?? baseDetails.paymentDetails,
      timelineEvents: normalizedPatch.timelineEvents ?? baseDetails.timelineEvents,
      contactDetails: normalizedPatch.contactDetails ?? baseDetails.contactDetails,
    },
    pending: {
      ...basePending,
      ...normalizedPatch,
    },
  };
}

export function mergeRemoteConversationDetails(
  currentState: ConversationDetailsCacheState | null,
  remoteDetails: ConversationDetails,
): ConversationDetailsCacheState {
  const normalizedRemote = normalizeConversationDetails(remoteDetails);
  if (!currentState) {
    return {
      details: normalizedRemote,
      pending: {},
    };
  }

  const pending = currentState.pending;
  let nextNotes = normalizedRemote.notes;
  let nextPaymentDetails = normalizedRemote.paymentDetails;
  let nextTimelineEvents = normalizedRemote.timelineEvents;
  let nextContactDetails = normalizedRemote.contactDetails;

  const nextPending: ConversationDetailsPendingPatch = {};

  if (typeof pending.notes === "string") {
    if (pending.notes !== normalizedRemote.notes) {
      nextNotes = currentState.details.notes;
      nextPending.notes = pending.notes;
    }
  }

  if (pending.paymentDetails) {
    if (!paymentDetailsEqual(pending.paymentDetails, normalizedRemote.paymentDetails)) {
      nextPaymentDetails = currentState.details.paymentDetails;
      nextPending.paymentDetails = pending.paymentDetails;
    }
  }

  if (Array.isArray(pending.timelineEvents)) {
    if (!timelineEventsEqual(pending.timelineEvents, normalizedRemote.timelineEvents)) {
      nextTimelineEvents = currentState.details.timelineEvents;
      nextPending.timelineEvents = pending.timelineEvents;
    }
  }

  if (pending.contactDetails) {
    if (!contactDetailsEqual(pending.contactDetails, normalizedRemote.contactDetails)) {
      nextContactDetails = currentState.details.contactDetails;
      nextPending.contactDetails = pending.contactDetails;
    }
  }

  return {
    details: {
      notes: nextNotes,
      paymentDetails: nextPaymentDetails,
      timelineEvents: nextTimelineEvents,
      contactDetails: nextContactDetails,
    },
    pending: nextPending,
  };
}

export function clearSyncedConversationDetailsPending(
  currentState: ConversationDetailsCacheState | null,
  syncedPatch: ConversationDetailsPendingPatch,
): ConversationDetailsCacheState {
  const baseState: ConversationDetailsCacheState = currentState ?? {
    details: normalizeConversationDetails(null),
    pending: {},
  };
  const normalizedPatch = normalizeConversationDetailsPendingPatch(syncedPatch);
  const nextPending: ConversationDetailsPendingPatch = {
    ...baseState.pending,
  };
  let nextNotes = baseState.details.notes;
  let nextPaymentDetails = baseState.details.paymentDetails;
  let nextTimelineEvents = baseState.details.timelineEvents;
  let nextContactDetails = baseState.details.contactDetails;

  if (typeof normalizedPatch.notes === "string") {
    const pendingNotes = nextPending.notes;
    if (typeof pendingNotes === "string") {
      if (pendingNotes === normalizedPatch.notes) {
        delete nextPending.notes;
        nextNotes = normalizedPatch.notes;
      }
    } else {
      nextNotes = normalizedPatch.notes;
    }
  }

  if (normalizedPatch.paymentDetails) {
    const pendingPaymentDetails = nextPending.paymentDetails;
    if (pendingPaymentDetails) {
      if (paymentDetailsEqual(pendingPaymentDetails, normalizedPatch.paymentDetails)) {
        delete nextPending.paymentDetails;
        nextPaymentDetails = normalizedPatch.paymentDetails;
      }
    } else {
      nextPaymentDetails = normalizedPatch.paymentDetails;
    }
  }

  if (Array.isArray(normalizedPatch.timelineEvents)) {
    const pendingTimelineEvents = nextPending.timelineEvents;
    if (Array.isArray(pendingTimelineEvents)) {
      if (timelineEventsEqual(pendingTimelineEvents, normalizedPatch.timelineEvents)) {
        delete nextPending.timelineEvents;
        nextTimelineEvents = normalizedPatch.timelineEvents;
      }
    } else {
      nextTimelineEvents = normalizedPatch.timelineEvents;
    }
  }

  if (normalizedPatch.contactDetails) {
    const pendingContactDetails = nextPending.contactDetails;
    if (pendingContactDetails) {
      if (contactDetailsEqual(pendingContactDetails, normalizedPatch.contactDetails)) {
        delete nextPending.contactDetails;
        nextContactDetails = normalizedPatch.contactDetails;
      }
    } else {
      nextContactDetails = normalizedPatch.contactDetails;
    }
  }

  return {
    details: {
      notes: nextNotes,
      paymentDetails: nextPaymentDetails,
      timelineEvents: nextTimelineEvents,
      contactDetails: nextContactDetails,
    },
    pending: nextPending,
  };
}
