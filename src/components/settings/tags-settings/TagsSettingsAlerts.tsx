"use client";

import { CheckCircle2, CircleAlert } from "lucide-react";
import type { TagsSettingsMessages } from "./types";

interface TagsSettingsAlertsProps {
  messages: TagsSettingsMessages;
}

export default function TagsSettingsAlerts({
  messages,
}: TagsSettingsAlertsProps) {
  return (
    <>
      {messages.successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          <CheckCircle2 size={16} />
          <span>{messages.successMessage}</span>
        </div>
      ) : null}

      {messages.errorMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          <CircleAlert size={16} />
          <span>{messages.errorMessage}</span>
        </div>
      ) : null}
    </>
  );
}