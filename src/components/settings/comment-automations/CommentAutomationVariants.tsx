"use client";

import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { MAX_AUTOMATION_MESSAGE_LENGTH } from "@/components/settings/comment-automations/CommentAutomationForm";
import {
  SETTINGS_ICON_BUTTON_CLASS,
  SETTINGS_INPUT_CLASS,
  SETTINGS_PRIMARY_BUTTON_CLASS,
} from "@/components/settings/settingsStyles";
import type { CommentAutomationVariant } from "@/lib/commentAutomationsRepository";

interface CommentAutomationVariantsProps {
  automationId: string;
  variants: CommentAutomationVariant[];
  onChange: (variants: CommentAutomationVariant[]) => void;
}

interface VariantApiResult {
  variant?: CommentAutomationVariant;
  error?: string;
}

const MIN_WEIGHT = 1;
const MAX_WEIGHT = 10;

async function readResult(res: Response): Promise<VariantApiResult | null> {
  const body: VariantApiResult | null = await res.json().catch(() => null);
  return body;
}

// The alternative messages an automation rotates between, with a form to add
// another. Each comment gets one at random, weighted by its number.
export default function CommentAutomationVariants({
  automationId,
  variants,
  onChange,
}: CommentAutomationVariantsProps) {
  const [message, setMessage] = useState("");
  const [weight, setWeight] = useState(MIN_WEIGHT);
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const variantsUrl = `/api/settings/comment-automations/${encodeURIComponent(automationId)}/variants`;
  const canAdd = message.trim().length > 0 && !isAdding;

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAdd) return;

    setIsAdding(true);
    setError("");

    try {
      const res = await fetch(variantsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, weight }),
      });
      const data = await readResult(res);
      if (!res.ok || !data?.variant) {
        throw new Error(data?.error || "Failed to add variant.");
      }
      onChange([...variants, data.variant]);
      setMessage("");
      setWeight(MIN_WEIGHT);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to add variant.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (variant: CommentAutomationVariant) => {
    if (removingId) return;

    setRemovingId(variant.id);
    setError("");

    try {
      const res = await fetch(
        `${variantsUrl}/${encodeURIComponent(variant.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await readResult(res);
        throw new Error(data?.error || "Failed to remove variant.");
      }
      onChange(variants.filter((row) => row.id !== variant.id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to remove variant.",
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <p className="text-sm font-semibold text-[#101011]">Split test</p>
      <p className="mt-1 max-w-2xl text-sm leading-snug text-[#606266]">
        Add other messages to find out which one converts best. Each comment
        gets one at random, and a higher weight is picked more often.
      </p>

      {variants.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {variants.map((variant, index) => (
            <li
              key={variant.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-white py-2 pl-4 pr-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[#101011]">
                  {variant.message}
                </p>
                <p className="text-xs tabular-nums text-[#9A9CA2]">
                  Variant {index + 1} · weight {variant.weight} ·{" "}
                  {variant.triggerCount} sent
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(variant)}
                disabled={removingId === variant.id}
                aria-label={`Remove variant ${index + 1}`}
                className={`${SETTINGS_ICON_BUTTON_CLASS} [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-600`}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={handleAdd}
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          aria-label="Variant message"
          value={message}
          maxLength={MAX_AUTOMATION_MESSAGE_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Another message to test"
          className={`${SETTINGS_INPUT_CLASS} sm:flex-1`}
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Variant weight"
            min={MIN_WEIGHT}
            max={MAX_WEIGHT}
            value={weight}
            onChange={(event) =>
              setWeight(Number.parseInt(event.target.value, 10) || MIN_WEIGHT)
            }
            className={`${SETTINGS_INPUT_CLASS} !w-16 !px-2 text-center tabular-nums`}
          />
          <button
            type="submit"
            disabled={!canAdd}
            className={`${SETTINGS_PRIMARY_BUTTON_CLASS} flex-1 sm:flex-none`}
          >
            {isAdding ? "Adding…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
