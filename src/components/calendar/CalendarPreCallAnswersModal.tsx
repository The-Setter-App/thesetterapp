"use client";

import { createPortal } from "react-dom";
import ModalShell from "@/components/ui/ModalShell";
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

  // Rendered at the end of the page, above the phone event dialog it can be
  // opened from.
  return createPortal(
    <ModalShell
      title={leadName}
      description={`${answers.length} answer${answers.length === 1 ? "" : "s"} submitted in Calendly before the call.`}
      onClose={onClose}
      maxWidthClassName="md:max-w-2xl"
      layerClassName="z-[1200]"
    >
      <ol className="space-y-2.5">
        {answers.map((answer, index) => (
          <li
            key={`${answer.position}-${answer.question}`}
            className="flex items-start gap-3 rounded-2xl bg-[#F8F7FF] p-4"
          >
            <span className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-[#8771FF] tabular-nums">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] font-medium text-[#606266]">
                {answer.question}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-[#101011]">
                {answer.answer}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </ModalShell>,
    document.body,
  );
}
