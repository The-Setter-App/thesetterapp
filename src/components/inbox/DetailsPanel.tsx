"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCachedConversationDetailsState,
  markCachedConversationDetailsSynced,
  setCachedConversationDetailsFromRemote,
  setCachedConversationDetailsLocal,
  type ConversationDetailsCacheState,
} from "@/lib/cache";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import type {
  ConversationContactDetails,
  ConversationDetails,
  ConversationTimelineEvent,
  PaymentDetails,
  SSEEvent,
  StatusType,
  User,
} from "@/types/inbox";
import CallsTab from "./details/CallsTab";
import DetailsPanelHeader from "./details/DetailsPanelHeader";
import NotesTab from "./details/NotesTab";
import PaymentsTab from "./details/PaymentsTab";
import SummaryTab from "./details/SummaryTab";
import TimelineTab from "./details/TimelineTab";

type DetailsTabName = "Summary" | "Notes" | "Timeline" | "Payments" | "Calls";

const DETAILS_TABS: DetailsTabName[] = [
  "Summary",
  "Notes",
  "Timeline",
  "Payments",
  "Calls",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]+$/;
const CONTACT_AUTOSAVE_DEBOUNCE_MS = 180;

function isContactDetailsValid(details: ConversationContactDetails): boolean {
  const email = details.email.trim();
  if (email.length > 0 && !EMAIL_REGEX.test(email)) return false;

  const phone = details.phoneNumber.trim();
  if (phone.length === 0) return true;

  if (!PHONE_REGEX.test(phone)) return false;
  const digitsCount = phone.replace(/\D/g, "").length;
  return digitsCount >= 7 && digitsCount <= 16;
}

interface DetailsPanelProps {
  user: User;
  width?: number;
  syncedDetails?: ConversationDetails | null;
}

export default function DetailsPanel({
  user,
  width,
  syncedDetails,
}: DetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailsTabName>("Summary");
  const [notes, setNotes] = useState("");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    amount: "",
    paymentMethod: "Fanbasis",
    payOption: "One Time",
    paymentFrequency: "One Time",
    setterPaid: "No",
    closerPaid: "No",
    paymentNotes: "",
  });
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<
    ConversationTimelineEvent[]
  >([]);
  const [contactDetails, setContactDetails] =
    useState<ConversationContactDetails>({
      phoneNumber: "",
      email: "",
    });
  const contactSaveAbortRef = useRef<AbortController | null>(null);
  const contactSaveTimerRef = useRef<number | null>(null);
  const lastSavedNotesRef = useRef<string>("");
  const lastSavedPaymentDetailsRef = useRef<string>("");
  const lastSavedContactDetailsRef = useRef<string>("");
  const notesPendingRef = useRef(false);
  const paymentPendingRef = useRef(false);
  const contactPendingRef = useRef(false);
  const latestNotesRef = useRef("");
  const latestPaymentSerializedRef = useRef("");
  const latestContactSerializedRef = useRef("");

  const updateDetailsCacheLocal = useCallback(
    async (patch: Partial<ConversationDetails>) => {
      if (!user.id) return;
      try {
        await setCachedConversationDetailsLocal(user.id, patch);
      } catch (error) {
        console.error("[DetailsPanel] Failed to update local details cache:", error);
      }
    },
    [user.id],
  );

  const markDetailsCacheSynced = useCallback(
    async (patch: Partial<ConversationDetails>) => {
      if (!user.id) return;
      try {
        await markCachedConversationDetailsSynced(user.id, patch);
      } catch (error) {
        console.error("[DetailsPanel] Failed to mark details cache as synced:", error);
      }
    },
    [user.id],
  );

  const applyDetailsCacheState = useCallback(
    (state: ConversationDetailsCacheState | null | undefined) => {
      const nextNotes = state?.details.notes ?? "";
      const nextPaymentDetails: PaymentDetails = {
        amount: state?.details.paymentDetails.amount ?? "",
        paymentMethod:
          state?.details.paymentDetails.paymentMethod ?? "Fanbasis",
        payOption: state?.details.paymentDetails.payOption ?? "One Time",
        paymentFrequency:
          state?.details.paymentDetails.paymentFrequency ?? "One Time",
        setterPaid: state?.details.paymentDetails.setterPaid ?? "No",
        closerPaid: state?.details.paymentDetails.closerPaid ?? "No",
        paymentNotes: state?.details.paymentDetails.paymentNotes ?? "",
      };
      const nextContactDetails: ConversationContactDetails = {
        phoneNumber: state?.details.contactDetails.phoneNumber ?? "",
        email: state?.details.contactDetails.email ?? "",
      };

      setNotes(nextNotes);
      setPaymentDetails(nextPaymentDetails);
      setTimelineEvents(state?.details.timelineEvents ?? []);
      setContactDetails(nextContactDetails);
      latestNotesRef.current = nextNotes;
      latestPaymentSerializedRef.current = JSON.stringify(nextPaymentDetails);
      latestContactSerializedRef.current = JSON.stringify(nextContactDetails);

      lastSavedNotesRef.current = nextNotes;
      lastSavedPaymentDetailsRef.current = JSON.stringify(nextPaymentDetails);
      lastSavedContactDetailsRef.current = JSON.stringify(nextContactDetails);
      notesPendingRef.current = typeof state?.pending.notes === "string";
      paymentPendingRef.current = Boolean(state?.pending.paymentDetails);
      contactPendingRef.current = Boolean(state?.pending.contactDetails);
    },
    [],
  );

  const handleNotesChange = useCallback(
    (next: string) => {
      notesPendingRef.current = true;
      latestNotesRef.current = next;
      setNotes(next);
      updateDetailsCacheLocal({ notes: next }).catch((error) =>
        console.error("[DetailsPanel] Failed to cache notes draft:", error),
      );
    },
    [updateDetailsCacheLocal],
  );

  const handlePaymentDetailsChange = useCallback(
    (next: PaymentDetails) => {
      paymentPendingRef.current = true;
      latestPaymentSerializedRef.current = JSON.stringify(next);
      setPaymentDetails(next);
      updateDetailsCacheLocal({ paymentDetails: next }).catch((error) =>
        console.error(
          "[DetailsPanel] Failed to cache payment details draft:",
          error,
        ),
      );
    },
    [updateDetailsCacheLocal],
  );

  const handleContactDetailsChange = useCallback(
    (next: ConversationContactDetails) => {
      contactPendingRef.current = true;
      latestContactSerializedRef.current = JSON.stringify(next);
      setContactDetails(next);
      updateDetailsCacheLocal({ contactDetails: next }).catch((error) =>
        console.error(
          "[DetailsPanel] Failed to cache contact details draft:",
          error,
        ),
      );
    },
    [updateDetailsCacheLocal],
  );

  const appendStatusTimelineEvent = useCallback(
    (status: StatusType, idPrefix: string) => {
      const now = Date.now();
      setTimelineEvents((prev) => {
        const last = prev[prev.length - 1];
        if (last?.status === status) {
          const lastTs = new Date(last.timestamp).getTime();
          if (Number.isFinite(lastTs) && now - lastTs < 3000) return prev;
        }
        return [
          ...prev,
          {
            id: `${idPrefix}_${now}_${Math.random().toString(36).slice(2, 8)}`,
            type: "status_update",
            status,
            title: status,
            sub: `Status changed to ${status}`,
            timestamp: new Date(now).toISOString(),
          },
        ];
      });
    },
    [],
  );

  useEffect(() => {
    const conversationId = user.id;
    if (!conversationId) return;

    let active = true;
    setDetailsLoaded(false);

    (async () => {
      try {
        if (syncedDetails) {
          const cachedState = await getCachedConversationDetailsState(
            conversationId,
          );
          if (active) {
            applyDetailsCacheState(
              cachedState ?? {
                details: syncedDetails,
                pending: {},
              },
            );
            setDetailsLoaded(true);
          }
        }

        const res = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversationId)}/details`,
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as { details?: ConversationDetails };
        if (!active) return;
        if (data.details) {
          const remoteState = await setCachedConversationDetailsFromRemote(
            conversationId,
            data.details,
          );
          if (!active) return;
          applyDetailsCacheState(remoteState);
        }
      } catch (error) {
        console.error("[DetailsPanel] Failed to fetch details:", error);
      } finally {
        if (active) setDetailsLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [applyDetailsCacheState, syncedDetails, user.id]);

  useEffect(() => {
    if (!user.id) return;
    lastSavedNotesRef.current = "";
    lastSavedPaymentDetailsRef.current = "";
    lastSavedContactDetailsRef.current = "";
    notesPendingRef.current = false;
    paymentPendingRef.current = false;
    contactPendingRef.current = false;
    latestNotesRef.current = "";
    latestPaymentSerializedRef.current = "";
    latestContactSerializedRef.current = "";
    if (contactSaveTimerRef.current) {
      window.clearTimeout(contactSaveTimerRef.current);
      contactSaveTimerRef.current = null;
    }
    contactSaveAbortRef.current?.abort();
  }, [user.id]);

  useEffect(() => {
    if (!detailsLoaded || !user.id) return;
    if (!notesPendingRef.current && notes === lastSavedNotesRef.current) return;
    const nextNotes = notes;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: nextNotes }),
          },
        );
        if (!response.ok) return;
        await markDetailsCacheSynced({ notes: nextNotes });
        if (latestNotesRef.current === nextNotes) {
          lastSavedNotesRef.current = nextNotes;
          notesPendingRef.current = false;
        }
      } catch (error) {
        console.error("[DetailsPanel] Failed to save notes:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsLoaded, markDetailsCacheSynced, notes, user.id]);

  useEffect(() => {
    if (!detailsLoaded || !user.id) return;
    const serialized = JSON.stringify(paymentDetails);
    if (
      !paymentPendingRef.current &&
      serialized === lastSavedPaymentDetailsRef.current
    ) {
      return;
    }
    const nextPaymentDetails = paymentDetails;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentDetails: nextPaymentDetails }),
          },
        );
        if (!response.ok) return;
        await markDetailsCacheSynced({ paymentDetails: nextPaymentDetails });
        if (latestPaymentSerializedRef.current === serialized) {
          lastSavedPaymentDetailsRef.current = serialized;
          paymentPendingRef.current = false;
        }
      } catch (error) {
        console.error("[DetailsPanel] Failed to save payment details:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsLoaded, markDetailsCacheSynced, paymentDetails, user.id]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<SSEEvent>;
      const message = customEvent.detail;
      if (!message || typeof message !== "object") return;
      if (message.type !== "user_status_updated") return;
      if (message.data.conversationId !== user.id) return;
      appendStatusTimelineEvent(message.data.status, "status_sse");
    };

    window.addEventListener(INBOX_SSE_EVENT, handler);
    return () => window.removeEventListener(INBOX_SSE_EVENT, handler);
  }, [appendStatusTimelineEvent, user.id]);

  const persistContactDetails = useCallback(
    async (next: ConversationContactDetails) => {
      if (!detailsLoaded || !user.id) return;
      if (!isContactDetailsValid(next)) return;

      const serialized = JSON.stringify(next);
      if (
        !contactPendingRef.current &&
        serialized === lastSavedContactDetailsRef.current
      ) {
        return;
      }

      contactSaveAbortRef.current?.abort();
      const controller = new AbortController();
      contactSaveAbortRef.current = controller;

      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactDetails: next }),
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        await markDetailsCacheSynced({ contactDetails: next });
        if (latestContactSerializedRef.current === serialized) {
          lastSavedContactDetailsRef.current = serialized;
          contactPendingRef.current = false;
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("[DetailsPanel] Failed to save contact details:", error);
      }
    },
    [detailsLoaded, markDetailsCacheSynced, user.id],
  );

  const commitContactDetails = useCallback(
    async (next: ConversationContactDetails) => {
      if (contactSaveTimerRef.current) {
        window.clearTimeout(contactSaveTimerRef.current);
        contactSaveTimerRef.current = null;
      }
      await persistContactDetails(next);
    },
    [persistContactDetails],
  );

  useEffect(() => {
    return () => {
      if (contactSaveTimerRef.current) {
        window.clearTimeout(contactSaveTimerRef.current);
        contactSaveTimerRef.current = null;
      }
      contactSaveAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!detailsLoaded || !user.id || !isContactDetailsValid(contactDetails))
      return;

    const serialized = JSON.stringify(contactDetails);
    if (
      !contactPendingRef.current &&
      serialized === lastSavedContactDetailsRef.current
    ) {
      return;
    }

    if (contactSaveTimerRef.current) {
      window.clearTimeout(contactSaveTimerRef.current);
      contactSaveTimerRef.current = null;
    }

    contactSaveTimerRef.current = window.setTimeout(() => {
      persistContactDetails(contactDetails).catch((error) => {
        console.error("[DetailsPanel] Failed to save contact details:", error);
      });
      contactSaveTimerRef.current = null;
    }, CONTACT_AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (contactSaveTimerRef.current) {
        window.clearTimeout(contactSaveTimerRef.current);
        contactSaveTimerRef.current = null;
      }
    };
  }, [contactDetails, detailsLoaded, persistContactDetails, user.id]);

  useEffect(() => {
    const handleLocalStatus = (event: Event) => {
      const custom = event as CustomEvent<{
        userId?: string;
        status?: StatusType;
      }>;
      if (
        !custom.detail?.userId ||
        custom.detail.userId !== user.id ||
        !custom.detail.status
      ) {
        return;
      }
      appendStatusTimelineEvent(custom.detail.status, "status_local");
    };

    window.addEventListener("userStatusUpdated", handleLocalStatus);
    return () =>
      window.removeEventListener("userStatusUpdated", handleLocalStatus);
  }, [appendStatusTimelineEvent, user.id]);

  const getTabButtonClass = (tabName: DetailsTabName) => {
    const isActive = activeTab === tabName;
    return isActive
      ? "px-5 py-1.5 bg-[#8771FF] text-white rounded-full shadow-md text-xs font-semibold"
      : "px-3 py-1.5 text-xs font-semibold text-[#606266] hover:text-[#101011] cursor-pointer";
  };

  const handleClearTimeline = useCallback(async () => {
    if (!user.id) return;
    setTimelineEvents([]);
    await updateDetailsCacheLocal({ timelineEvents: [] });
    try {
      const response = await fetch(
        `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timelineEvents: [] }),
        },
      );
      if (!response.ok) return;
      await markDetailsCacheSynced({ timelineEvents: [] });
    } catch (error) {
      console.error("[DetailsPanel] Failed to clear timeline:", error);
    }
  }, [markDetailsCacheSynced, updateDetailsCacheLocal, user.id]);

  return (
    <aside
      className="relative flex shrink-0 flex-col bg-white"
      style={width ? { width: `${width}px` } : { width: "400px" }}
    >
      <DetailsPanelHeader
        user={user}
        contactDetails={contactDetails}
        onChangeContactDetails={handleContactDetailsChange}
        onCommitContactDetails={commitContactDetails}
      />

      <hr className="border-[#F0F2F6]" />

      <div className="flex items-center justify-around border-b border-[#F0F2F6] px-2 py-2 text-sm font-semibold text-[#606266]">
        {DETAILS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={getTabButtonClass(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {activeTab === "Summary" && <SummaryTab conversationId={user.id} />}
        {activeTab === "Notes" && (
          <NotesTab notes={notes} onChange={handleNotesChange} />
        )}
        {activeTab === "Timeline" && (
          <TimelineTab events={timelineEvents} onClear={handleClearTimeline} />
        )}
        {activeTab === "Payments" && (
          <PaymentsTab
            value={paymentDetails}
            onChange={handlePaymentDetailsChange}
          />
        )}
        {activeTab === "Calls" && <CallsTab />}
      </div>
    </aside>
  );
}
