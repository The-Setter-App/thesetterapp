export type CalendlyInviteeEventType =
  | "invitee.created"
  | "invitee.canceled"
  | "invitee.rescheduled";

export type CalendlyWebhookEventType = "invitee.created" | "invitee.canceled";

export type CalendlyCallStatus =
  | "booked"
  | "canceled"
  | "rescheduled"
  | "unknown";

export type CalendlyPreCallAnswersStatus =
  | "available"
  | "missing"
  | "unavailable";

export interface CalendlyQuestionAnswer {
  question: string;
  answer: string;
  position: number;
}

export interface CalendlyConnection {
  id: string;
  workspaceOwnerEmail: string;
  schedulingUrl: string;
  isConnected: boolean;
  connectedAt: string;
  oauthAccessTokenExpiresAt: string;
  oauthScope?: string;
  oauthTokenType?: string;
  calendlyUserUri?: string;
  organizationUri?: string;
  webhookSubscriptionUri?: string;
}

export interface ConversationCallEvent {
  id: string;
  conversationId: string | null;
  eventType: CalendlyInviteeEventType;
  status: CalendlyCallStatus;
  title: string;
  startTime: string;
  endTime: string;
  timezone: string;
  joinUrl?: string;
  cancelUrl?: string;
  rescheduleUrl?: string;
  inviteeName?: string;
  inviteeEmail?: string;
  calendlyEventUri?: string;
  calendlyInviteeUri?: string;
  preCallAnswers?: CalendlyQuestionAnswer[];
  preCallAnswersStatus?: CalendlyPreCallAnswersStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCalendarCallEvent extends ConversationCallEvent {
  leadName: string;
  amount?: string;
}

export interface CalendlySchedulingUrlInput {
  schedulingUrl: string;
}

export interface CalendlyCreateWebhookSubscriptionResult {
  resourceUri: string;
}

export interface CalendlyWebhookEventPayload {
  created_at?: string;
  event?: string;
  payload?: {
    uri?: string;
    event?: string;
    invitee?: string;
    old_invitee?: string;
    rescheduled?: boolean;
    tracking?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_term?: string;
      utm_content?: string;
      salesforce_uuid?: string;
    };
    event_type?:
      | string
      | {
          uri?: string;
          name?: string;
        };
    scheduled_event?: {
      uri?: string;
      name?: string;
      start_time?: string;
      end_time?: string;
      timezone?: string;
    };
    name?: string;
    email?: string;
    status?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string;
    cancel_url?: string;
    reschedule_url?: string;
    location?: {
      type?: string;
      location?: string;
      join_url?: string;
      status?: string;
    };
    questions_and_answers?: Array<{
      question?: string;
      answer?: string;
      position?: number;
    }>;
  };
}
