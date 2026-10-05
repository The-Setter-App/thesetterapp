"use client";

import { useCallback, useState } from "react";
import type {
  CommentAutomation,
  CommentAutomationVariant,
  CommentAutomationWithDetails,
} from "@/lib/commentAutomationsRepository";

export interface NewCommentAutomationInput {
  name: string;
  keyword: string;
  mediaId: string;
  replyMessage: string;
}

interface ApiResult {
  automation?: CommentAutomation;
  success?: boolean;
  error?: string;
}

export interface CommentAutomationsController {
  automations: CommentAutomationWithDetails[];
  // The automation whose toggle or delete is still on its way to the server.
  pendingId: string | null;
  successMessage: string;
  errorMessage: string;
  // Resolves to true once the automation has been saved.
  createAutomation: (input: NewCommentAutomationInput) => Promise<boolean>;
  toggleEnabled: (automation: CommentAutomationWithDetails) => Promise<void>;
  removeAutomation: (automation: CommentAutomationWithDetails) => Promise<void>;
  setVariants: (
    automationId: string,
    variants: CommentAutomationVariant[],
  ) => void;
}

const AUTOMATIONS_URL = "/api/settings/comment-automations";

function automationUrl(id: string): string {
  return `${AUTOMATIONS_URL}/${encodeURIComponent(id)}`;
}

async function readResult(res: Response): Promise<ApiResult | null> {
  const body: ApiResult | null = await res.json().catch(() => null);
  return body;
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Holds the list of comment automations and talks to the settings API when
// one is added, switched on or off, or removed.
export function useCommentAutomations(
  initialAutomations: CommentAutomationWithDetails[],
): CommentAutomationsController {
  const [automations, setAutomations] = useState(initialAutomations);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const createAutomation = useCallback(
    async (input: NewCommentAutomationInput): Promise<boolean> => {
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const res = await fetch(AUTOMATIONS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await readResult(res);
        const created = data?.automation;
        if (!res.ok || !created) {
          throw new Error(data?.error || "Failed to create automation.");
        }

        setAutomations((current) => [
          ...current,
          { ...created, variants: [], stats: [] },
        ]);
        setSuccessMessage(`"${created.name}" is live.`);
        return true;
      } catch (error) {
        setErrorMessage(toMessage(error, "Failed to create automation."));
        return false;
      }
    },
    [],
  );

  const toggleEnabled = useCallback(
    async (automation: CommentAutomationWithDetails): Promise<void> => {
      if (pendingId) return;
      const nextEnabled = !automation.enabled;
      const applyEnabled = (enabled: boolean) =>
        setAutomations((current) =>
          current.map((row) =>
            row.id === automation.id ? { ...row, enabled } : row,
          ),
        );

      setPendingId(automation.id);
      setErrorMessage("");
      // Flip the switch straight away and put it back if the save fails.
      applyEnabled(nextEnabled);

      try {
        const res = await fetch(automationUrl(automation.id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: nextEnabled }),
        });
        if (!res.ok) {
          const data = await readResult(res);
          throw new Error(data?.error || "Failed to update automation.");
        }
      } catch (error) {
        applyEnabled(automation.enabled);
        setErrorMessage(toMessage(error, "Failed to update automation."));
      } finally {
        setPendingId(null);
      }
    },
    [pendingId],
  );

  const removeAutomation = useCallback(
    async (automation: CommentAutomationWithDetails): Promise<void> => {
      if (pendingId) return;

      setPendingId(automation.id);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const res = await fetch(automationUrl(automation.id), {
          method: "DELETE",
        });
        const data = await readResult(res);
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to delete automation.");
        }
        setAutomations((current) =>
          current.filter((row) => row.id !== automation.id),
        );
        setSuccessMessage(`"${automation.name}" removed.`);
      } catch (error) {
        setErrorMessage(toMessage(error, "Failed to delete automation."));
      } finally {
        setPendingId(null);
      }
    },
    [pendingId],
  );

  const setVariants = useCallback(
    (automationId: string, variants: CommentAutomationVariant[]) => {
      setAutomations((current) =>
        current.map((row) =>
          row.id === automationId ? { ...row, variants } : row,
        ),
      );
    },
    [],
  );

  return {
    automations,
    pendingId,
    successMessage,
    errorMessage,
    createAutomation,
    toggleEnabled,
    removeAutomation,
    setVariants,
  };
}
