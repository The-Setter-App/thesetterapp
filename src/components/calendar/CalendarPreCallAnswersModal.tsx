"use client";

import { FileText, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import type { CalendlyQuestionAnswer } from "@/types/calendly";

interface CalendarPreCallAnswersModalProps {
  open: boolean;
  leadName: string;
  answers: CalendlyQuestionAnswer[];
  onClose: () => void;
}

export default function CalendarPreCallAnswersModal({
  open,
  leadName,
  answers,
  onClose,
}: CalendarPreCallAnswersModalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#101011]/50 p-3 backdrop-blur-[2px] md:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-[#F0F2F6] bg-white shadow-[0_24px_80px_rgba(16,16,17,0.18)]">
        <div className="border-b border-[#F0F2F6] px-5 py-5 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F3F0FF] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d5ed6]">
                  <FileText size={14} />
                  Pre-call intake
                </span>
                <span className="inline-flex items-center rounded-full bg-[#F8F7FF] px-2.5 py-1 text-[11px] font-semibold text-[#606266]">
                  {answers.length} answer{answers.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight text-[#101011]">
                {leadName}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#606266]">
                Review the exact answers submitted in Calendly before the call.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-11 w-11 rounded-2xl border border-white/70 bg-white/80 text-[#606266] hover:bg-white"
              aria-label="Close pre-call intake modal"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F8F7FF] px-4 py-4 md:px-6 md:py-6">
          <div className="space-y-3">
            {answers.map((answer, index) => (
              <div
                key={`${answer.position}-${answer.question}`}
                className="rounded-2xl border border-[#F0F2F6] bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-[#F3F0FF] px-2 text-[11px] font-bold text-[#6d5ed6]">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9CA2]">
                      {answer.question}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#101011]">
                      {answer.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
