"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INBOX_SSE_EVENT } from "@/lib/inbox/clientRealtimeEvents";
import { setCachedConversationDetails } from "@/lib/clientCache";
import {
  loadInboxTagCatalog,
} from "@/lib/inbox/clientTagCatalog";
import { subscribeInboxTagCatalogChanged } from "@/lib/inbox/clientTagCatalogSync";
import {
  emitConversationTagsSynced,
  syncConversationTagsToClientCache,
} from "@/lib/inbox/clientTagSync";
import type {
  ConversationContactDetails,
  ConversationDetails,
  ConversationTimelineEvent,
  PaymentDetails,
  StatusType,
  User,
} from "@/types/inbox";
import type { SSEEvent } from "@/types/inbox";
import type { TagRow } from "@/types/tags";
import CallsTab from "./details/CallsTab";
import DetailsPanelHeader from "./details/DetailsPanelHeader";
import NotesTab from "./details/NotesTab";
import PaymentsTab from "./details/PaymentsTab";
import SummaryTab from "./details/SummaryTab";
import TagsTab from "./details/TagsTab";
import TimelineTab from "./details/TimelineTab";

type DetailsTabName =
  | "Summary"
  | "Notes"
  | "Tags"
  | "Timeline"
  | "Payments"
  | "Calls";

const DETAILS_TABS: DetailsTabName[] = [
  "Summary",
  "Notes",
  "Tags",
  "Timeline",
  "Payments",
  "Calls",
];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9+\-() ]+$/;

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
  syncedAt?: number;
}

export default function DetailsPanel({
  user,
  width,
  syncedDetails,
  syncedAt,
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
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagRow[]>([]);
  const [loadingAvailableTags, setLoadingAvailableTags] = useState(false);
  const tagCatalogRefreshInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const contactSaveAbortRef = useRef<AbortController | null>(null);
  const lastSavedContactDetailsRef = useRef<string>("");
  const syncDetailsCache = useCallback(
    async (overrides?: Partial<ConversationDetails>) => {
      if (!user.id) return;
      try {
        await setCachedConversationDetails(user.id, {
          notes,
          paymentDetails,
          timelineEvents,
          contactDetails,
          tagIds,
          ...overrides,
        });
      } catch (error) {
        console.error("[DetailsPanel] Failed to update details cache:", error);
      }
    },
    [contactDetails, notes, paymentDetails, tagIds, timelineEvents, user.id],
  );

  const refreshAvailableTags = useCallback(async () => {
    if (tagCatalogRefreshInFlightRef.current) return;

    tagCatalogRefreshInFlightRef.current = true;
    if (isMountedRef.current) {
      setLoadingAvailableTags(true);
    }

    try {
      const tags = await loadInboxTagCatalog();
      if (!isMountedRef.current) return;
      setAvailableTags(tags);
    } catch (error) {
      console.error("[DetailsPanel] Failed to load inbox tags:", error);
    } finally {
      tagCatalogRefreshInFlightRef.current = false;
      if (isMountedRef.current) {
        setLoadingAvailableTags(false);
      }
    }
  }, []);
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

    const applyDetails = (details: ConversationDetails | null | undefined) => {
      const nextContactDetails: ConversationContactDetails = {
        phoneNumber: details?.contactDetails?.phoneNumber ?? "",
        email: details?.contactDetails?.email ?? "",
      };
      setNotes(details?.notes ?? "");
      setPaymentDetails({
        amount: details?.paymentDetails?.amount ?? "",
        paymentMethod: details?.paymentDetails?.paymentMethod ?? "Fanbasis",
        payOption: details?.paymentDetails?.payOption ?? "One Time",
        paymentFrequency:
          details?.paymentDetails?.paymentFrequency ?? "One Time",
        setterPaid: details?.paymentDetails?.setterPaid ?? "No",
        closerPaid: details?.paymentDetails?.closerPaid ?? "No",
        paymentNotes: details?.paymentDetails?.paymentNotes ?? "",
      });
      setTimelineEvents(
        Array.isArray(details?.timelineEvents) ? details.timelineEvents : [],
      );
      setContactDetails(nextContactDetails);
      lastSavedContactDetailsRef.current = JSON.stringify(nextContactDetails);
      setTagIds(Array.isArray(details?.tagIds) ? details.tagIds : []);
    };

    if (syncedDetails) {
      applyDetails(syncedDetails);
      setDetailsLoaded(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(conversationId)}/details`,
        );
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        applyDetails(data.details);
      } catch (error) {
        console.error("[DetailsPanel] Failed to fetch details:", error);
      } finally {
        if (active) setDetailsLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [syncedDetails, syncedAt, user.id]);

  useEffect(() => {
    lastSavedContactDetailsRef.current = "";
    contactSaveAbortRef.current?.abort();
  }, [user.id]);

  useEffect(() => {
    if (!detailsLoaded || !user.id) return;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes }),
          },
        );
        if (!response.ok) return;
        await syncDetailsCache({ notes });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save notes:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsLoaded, notes, syncDetailsCache, user.id]);

  useEffect(() => {
    if (!detailsLoaded || !user.id) return;

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentDetails }),
          },
        );
        if (!response.ok) return;
        await syncDetailsCache({ paymentDetails });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save payment details:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsLoaded, paymentDetails, syncDetailsCache, user.id]);

  useEffect(() => {
    if (!detailsLoaded || !user.id) return;

    const timeout = window.setTimeout(async () => {
      const payloadTagIds = [...tagIds];
      emitConversationTagsSynced({
        conversationId: user.id,
        tagIds: payloadTagIds,
      });
      syncConversationTagsToClientCache(user.id, payloadTagIds).catch((error) =>
        console.error("[DetailsPanel] Failed to sync tag cache:", error),
      );

      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagIds: payloadTagIds }),
          },
        );
        if (!response.ok) return;
        await syncDetailsCache({ tagIds: payloadTagIds });
      } catch (error) {
        console.error("[DetailsPanel] Failed to save tags:", error);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [detailsLoaded, syncDetailsCache, tagIds, user.id]);

  useEffect(() => {
    refreshAvailableTags().catch((error) =>
      console.error("[DetailsPanel] Failed to initialize tags:", error),
    );
  }, [refreshAvailableTags]);

  useEffect(() => {
    return subscribeInboxTagCatalogChanged((tags) => {
      if (Array.isArray(tags)) {
        setAvailableTags(tags);
        return;
      }
      refreshAvailableTags().catch((error) =>
        console.error("[DetailsPanel] Failed to refresh tags after catalog update:", error),
      );
    });
  }, [refreshAvailableTags]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const commitContactDetails = useCallback(
    async (next: ConversationContactDetails) => {
      if (!detailsLoaded || !user.id) return;
      if (!isContactDetailsValid(next)) return;

      const serialized = JSON.stringify(next);
      if (serialized === lastSavedContactDetailsRef.current) return;

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
        lastSavedContactDetailsRef.current = serialized;
        await syncDetailsCache({ contactDetails: next });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("[DetailsPanel] Failed to save contact details:", error);
      }
    },
    [detailsLoaded, syncDetailsCache, user.id],
  );

  useEffect(() => {
    return () => {
      contactSaveAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!detailsLoaded || !user.id || !isContactDetailsValid(contactDetails)) return;

    const serialized = JSON.stringify(contactDetails);
    if (serialized === lastSavedContactDetailsRef.current) return;

    contactSaveAbortRef.current?.abort();
    const controller = new AbortController();
    contactSaveAbortRef.current = controller;

    (async () => {
      try {
        const response = await fetch(
          `/api/inbox/conversations/${encodeURIComponent(user.id)}/details`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactDetails }),
            signal: controller.signal,
          },
        );
        if (!response.ok) return;
        lastSavedContactDetailsRef.current = serialized;
        await syncDetailsCache({ contactDetails });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("[DetailsPanel] Failed to save contact details:", error);
      }
    })();
  }, [contactDetails, detailsLoaded, syncDetailsCache, user.id]);

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
      )
        return;
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
      : "px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 cursor-pointer";
  };

  const handleClearTimeline = useCallback(async () => {
    if (!user.id) return;
    setTimelineEvents([]);
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
      await syncDetailsCache({ timelineEvents: [] });
    } catch (error) {
      console.error("[DetailsPanel] Failed to clear timeline:", error);
    }
  }, [syncDetailsCache, user.id]);

  return (
    <aside
      className="bg-white flex flex-col flex-shrink-0 relative"
      style={width ? { width: `${width}px` } : { width: "400px" }}
    >
      {/* Header: Avatar, Name, Status, Contacts, Setter/Closer */}
      <DetailsPanelHeader
        user={user}
        contactDetails={contactDetails}
        onChangeContactDetails={setContactDetails}
        onCommitContactDetails={commitContactDetails}
      />

      <hr className="border-gray-200" />

      {/* Tab Bar */}
      <div className="flex items-center justify-around px-2 py-2 border-b border-gray-200 text-sm font-semibold text-gray-500">
        {DETAILS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={getTabButtonClass(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col">
        {activeTab === "Summary" && <SummaryTab conversationId={user.id} />}
        {activeTab === "Notes" && (
          <NotesTab notes={notes} onChange={setNotes} />
        )}
        {activeTab === "Tags" && (
          <TagsTab
            availableTags={availableTags}
            selectedTagIds={tagIds}
            loading={loadingAvailableTags}
            onChangeTagIds={setTagIds}
          />
        )}
        {activeTab === "Timeline" && (
          <TimelineTab events={timelineEvents} onClear={handleClearTimeline} />
        )}
        {activeTab === "Payments" && (
          <PaymentsTab value={paymentDetails} onChange={setPaymentDetails} />
        )}
        {activeTab === "Calls" && <CallsTab />}
      </div>
    </aside>
  );
}
