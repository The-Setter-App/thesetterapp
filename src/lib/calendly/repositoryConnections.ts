import { randomBytes } from "node:crypto";
import { encryptData } from "@/lib/crypto";
import { getInboxSupabase } from "@/lib/inbox/repository/core";
import type { WorkspaceCalendlyConnectionRow } from "@/lib/supabase/types";
import type { CalendlyConnection } from "@/types/calendly";
import {
  CALENDLY_CONNECTIONS_TABLE,
  type CalendlyConnectionSecret,
  CONNECTION_SELECT_COLUMNS,
  mapConnectionRow,
  mapConnectionSecretRow,
} from "./repository.shared";

export async function getCalendlyConnectionByOwnerEmail(
  workspaceOwnerEmail: string,
): Promise<CalendlyConnection | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(CONNECTION_SELECT_COLUMNS)
    .eq("workspace_owner_email", workspaceOwnerEmail)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection: ${error.message}`,
    );
  }
  if (!data) return null;
  return mapConnectionRow(data as WorkspaceCalendlyConnectionRow);
}

export async function getCalendlyConnectionSecretByOwnerEmail(
  workspaceOwnerEmail: string,
): Promise<CalendlyConnectionSecret | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(CONNECTION_SELECT_COLUMNS)
    .eq("workspace_owner_email", workspaceOwnerEmail)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection secret: ${error.message}`,
    );
  }
  if (!data) return null;
  return mapConnectionSecretRow(data as WorkspaceCalendlyConnectionRow);
}

export async function getCalendlyConnectionSecretById(
  id: string,
): Promise<CalendlyConnectionSecret | null> {
  const supabase = getInboxSupabase();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .select(CONNECTION_SELECT_COLUMNS)
    .eq("id", id)
    .eq("is_connected", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to load connection by id: ${error.message}`,
    );
  }
  if (!data) return null;
  return mapConnectionSecretRow(data as WorkspaceCalendlyConnectionRow);
}

export async function upsertCalendlyConnection(input: {
  workspaceOwnerEmail: string;
  oauthAccessToken: string;
  oauthRefreshToken: string;
  oauthAccessTokenExpiresAt: string;
  oauthScope?: string;
  oauthTokenType?: string;
  calendlyUserUri?: string;
  organizationUri?: string;
  schedulingUrl: string;
  webhookSigningKey: string;
  webhookSubscriptionUri?: string;
}): Promise<CalendlyConnection> {
  const supabase = getInboxSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .upsert(
      {
        workspace_owner_email: input.workspaceOwnerEmail,
        oauth_access_token: encryptData(input.oauthAccessToken),
        oauth_refresh_token: encryptData(input.oauthRefreshToken),
        oauth_access_token_expires_at: input.oauthAccessTokenExpiresAt,
        oauth_scope: input.oauthScope ?? null,
        oauth_token_type: input.oauthTokenType ?? null,
        calendly_user_uri: input.calendlyUserUri ?? null,
        organization_uri: input.organizationUri ?? null,
        scheduling_url: input.schedulingUrl,
        webhook_signing_key: encryptData(input.webhookSigningKey),
        webhook_subscription_uri: input.webhookSubscriptionUri ?? null,
        is_connected: true,
        connected_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "workspace_owner_email" },
    )
    .select(CONNECTION_SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(
      `[CalendlyRepository] Failed to upsert connection: ${error?.message || "Unknown error"}`,
    );
  }
  return mapConnectionRow(data as WorkspaceCalendlyConnectionRow);
}

export async function updateCalendlyConnectionOAuthTokens(input: {
  workspaceOwnerEmail: string;
  oauthAccessToken: string;
  oauthRefreshToken: string;
  oauthAccessTokenExpiresAt: string;
  oauthScope?: string;
  oauthTokenType?: string;
}): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .update({
      oauth_access_token: encryptData(input.oauthAccessToken),
      oauth_refresh_token: encryptData(input.oauthRefreshToken),
      oauth_access_token_expires_at: input.oauthAccessTokenExpiresAt,
      oauth_scope: input.oauthScope ?? null,
      oauth_token_type: input.oauthTokenType ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", input.workspaceOwnerEmail)
    .eq("is_connected", true);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to update OAuth tokens: ${error.message}`,
    );
  }
}

export async function updateCalendlyConnectionSchedulingUrl(input: {
  workspaceOwnerEmail: string;
  schedulingUrl: string;
}): Promise<CalendlyConnection | null> {
  const supabase = getInboxSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .update({
      scheduling_url: input.schedulingUrl,
      updated_at: nowIso,
    })
    .eq("workspace_owner_email", input.workspaceOwnerEmail)
    .eq("is_connected", true)
    .select(CONNECTION_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to update scheduling URL: ${error.message}`,
    );
  }

  if (!data) return null;
  return mapConnectionRow(data as WorkspaceCalendlyConnectionRow);
}

export async function disconnectCalendlyConnection(
  workspaceOwnerEmail: string,
): Promise<void> {
  const supabase = getInboxSupabase();
  const { error } = await supabase
    .from(CALENDLY_CONNECTIONS_TABLE)
    .update({
      is_connected: false,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_owner_email", workspaceOwnerEmail);

  if (error) {
    throw new Error(
      `[CalendlyRepository] Failed to disconnect connection: ${error.message}`,
    );
  }
}

export function generateWebhookSigningKey(): string {
  return randomBytes(32).toString("hex");
}
