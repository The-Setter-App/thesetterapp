"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AssistantMarkdown from "@/components/setter-ai/AssistantMarkdown";
import SetterAiAvatar from "@/components/setter-ai/SetterAiAvatar";

interface AssistantMessageBubbleProps {
  text: string;
  isPending?: boolean;
  // True while this reply is still being written; the copy action waits
  // until it is complete.
  isStreaming?: boolean;
}

const COPIED_FEEDBACK_MS = 1600;

export default function AssistantMessageBubble({
  text,
  isPending = false,
  isStreaming = false,
}: AssistantMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("[SetterAI] Failed to copy reply:", error);
      return;
    }

    setCopied(true);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      resetTimerRef.current = null;
    }, COPIED_FEEDBACK_MS);
  };

  if (isPending) {
    return (
      <div className="flex items-center gap-3">
        <SetterAiAvatar />
        <span className="thinking-shine text-[0.9375rem] font-medium">
          Thinking
        </span>
      </div>
    );
  }

  const canCopy = !isStreaming && text.trim().length > 0;

  return (
    <div className="flex items-start gap-3">
      <SetterAiAvatar />
      <div className="min-w-0 flex-1 pt-1">
        <div className="break-words text-[0.9375rem] leading-[1.6] text-[#101011]">
          <AssistantMarkdown text={text} />
        </div>
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="-ml-2 mt-1.5 inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-[#9A9CA2] outline-none transition-[transform,color,background-color] duration-100 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-[#F4F5F8] [@media(hover:hover)]:hover:text-[#606266]"
          >
            {copied ? (
              <Check size={13} aria-hidden="true" />
            ) : (
              <Copy size={13} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
