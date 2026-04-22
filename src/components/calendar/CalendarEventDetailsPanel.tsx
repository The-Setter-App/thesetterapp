"use client";

import {
  CalendarClock,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import CalendarPreCallAnswersModal from "@/components/calendar/CalendarPreCallAnswersModal";
import type { CalendarEvent } from "@/components/calendar/calendarEventModel";
import {
  EVENT_STATUS_CONFIG,
  EVENT_TYPE_CONFIG,
} from "@/components/calendar/calendarEventModel";
import { formatHour } from "@/components/calendar/calendarUtils";
import { Button } from "@/components/ui/Button";
import type {
  CalendlyQuestionAnswer,
  WorkspaceCalendarCallEvent,
} from "@/types/calendly";

interface CalendarEventDetailsPanelProps {
  event: CalendarEvent;
  detail: WorkspaceCalendarCallEvent | null;
  detailLoading: boolean;
  detailError: string;
  onClose: () => void;
}

const SUMMARY_PRIORITY_PATTERNS: RegExp[] = [
  /phone|whatsapp|text messages/i,
  /instagram|ig\b|profile/i,
  /business|niche|offer|bottleneck|about/i,
  /making per month|revenue|month|income/i,
  /financial|invest|budget|figures/i,
];

const SUMMARY_EXCLUDE_PATTERNS: RegExp[] = [/^name$/i, /^email$/i, /guest/i];

function selectSummaryAnswers(
  answers: CalendlyQuestionAnswer[],
): CalendlyQuestionAnswer[] {
  if (answers.length === 0) return [];

  const excluded = answers.filter((answer) =>
    SUMMARY_EXCLUDE_PATTERNS.some((pattern) => pattern.test(answer.question)),
  );
  const allowed = answers.filter((answer) => !excluded.includes(answer));
  const picked: CalendlyQuestionAnswer[] = [];
  const used = new Set<number>();

  for (const pattern of SUMMARY_PRIORITY_PATTERNS) {
    const match = allowed.find(
      (answer) => !used.has(answer.position) && pattern.test(answer.question),
    );
    if (!match) continue;
    picked.push(match);
    used.add(match.position);
    if (picked.length >= 4) return picked;
  }

  for (const answer of allowed) {
    if (used.has(answer.position)) continue;
    picked.push(answer);
    used.add(answer.position);
    if (picked.length >= 4) break;
  }

  return picked;
}

function truncateAnswer(value: string, maxLength = 96): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export default function CalendarEventDetailsPanel({
  event,
  detail,
  detailLoading,
  detailError,
  onClose,
}: CalendarEventDetailsPanelProps) {
  const [intakeOpen, setIntakeOpen] = useState(false);
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const statusConfig = EVENT_STATUS_CONFIG[event.status];
  const preCallAnswers = detail?.preCallAnswers ?? [];
  const summaryAnswers = useMemo(
    () => selectSummaryAnswers(preCallAnswers),
    [preCallAnswers],
  );
  const previewAnswer = summaryAnswers[0] ?? null;
  const extraAnswersCount = Math.max(preCallAnswers.length - 1, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#F0F2F6] p-4">
        <h3 className="text-sm font-semibold text-[#101011]">Event Details</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[#9A9CA2] transition-colors hover:bg-[#F8F7FF] hover:text-[#606266]"
          aria-label="Close event details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-4">
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${typeConfig.bgClass} ${typeConfig.textClass} ${typeConfig.borderClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${typeConfig.dotClass}`} />
            {typeConfig.label}
          </span>
        </div>

        <h4 className="mb-1 text-lg font-bold text-[#101011]">
          {event.leadName}
        </h4>
        <p className="mb-4 text-sm text-[#606266]">{event.title}</p>

        <div className="flex flex-col gap-3">
          <InfoCard
            icon={<Clock size={14} className="text-[#8771FF]" />}
            label="Time"
          >
            <p className="text-sm font-medium text-[#101011]">
              {formatHour(event.startHour)} ·{" "}
              {event.duration >= 1
                ? `${event.duration}h`
                : `${event.duration * 60}m`}
            </p>
          </InfoCard>

          <InfoCard
            icon={<User size={14} className="text-[#8771FF]" />}
            label="Assigned To"
          >
            <p className="text-sm font-medium text-[#101011]">
              {event.assignedTo}
            </p>
          </InfoCard>

          <InfoCard
            icon={<CalendarClock size={14} className="text-[#8771FF]" />}
            label="Status"
          >
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.bgClass} ${statusConfig.textClass} ${statusConfig.borderClass}`}
            >
              {statusConfig.label}
            </span>
          </InfoCard>

          {event.amount ? (
            <InfoCard
              icon={<DollarSign size={14} className="text-emerald-600" />}
              label="Deal Value"
              iconBgClass="bg-emerald-50"
            >
              <p className="text-sm font-bold text-emerald-700">
                {event.amount}
              </p>
            </InfoCard>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-[#EAE6FF] bg-[#F8F7FF]">
            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0EAFF]">
                  <FileText size={16} className="text-[#8771FF]" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8D8FA1]">
                  Pre-call Answers
                </p>
                {preCallAnswers.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6d5ed6] shadow-sm">
                    {preCallAnswers.length} captured
                  </span>
                ) : null}
              </div>

              <p className="mt-4 text-lg font-bold leading-tight text-[#101011]">
                Lead intake snapshot
              </p>
              <p className="mt-1 text-sm leading-6 text-[#606266]">
                Quick context pulled from Calendly before the call.
              </p>

              {preCallAnswers.length > 0 ? (
                <Button
                  type="button"
                  className="mt-4 h-12 w-full rounded-xl text-sm font-semibold"
                  onClick={() => setIntakeOpen(true)}
                  rightIcon={<FolderOpen size={16} />}
                >
                  Open Full Intake
                </Button>
              ) : null}
            </div>

            <div className="border-t border-[#ECE8FF] px-4 py-4">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl bg-white/80" />
                  <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
                </div>
              ) : detailError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                  {detailError}
                </div>
              ) : previewAnswer ? (
                <div className="rounded-2xl border border-white/80 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9CA2]">
                    {previewAnswer.question}
                  </p>
                  <p className="mt-2 break-words text-sm font-medium leading-6 text-[#101011]">
                    {truncateAnswer(previewAnswer.answer)}
                  </p>
                  {extraAnswersCount > 0 ? (
                    <p className="mt-3 text-xs font-medium text-[#6d5ed6]">
                      +{extraAnswersCount} more answer
                      {extraAnswersCount === 1 ? "" : "s"} in full intake
                    </p>
                  ) : null}
                </div>
              ) : detail?.preCallAnswersStatus === "unavailable" ? (
                <div className="rounded-2xl border border-white/80 bg-white px-4 py-4 text-sm leading-6 text-[#606266] shadow-sm">
                  Pre-call answers are unavailable for this booking.
                </div>
              ) : (
                <div className="rounded-2xl border border-white/80 bg-white px-4 py-4 text-sm leading-6 text-[#606266] shadow-sm">
                  No pre-call answers were captured for this booking.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CalendarPreCallAnswersModal
        open={intakeOpen}
        leadName={event.leadName}
        answers={preCallAnswers}
        onClose={() => setIntakeOpen(false)}
      />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  children,
  iconBgClass = "bg-[#F3F0FF]",
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  iconBgClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#F0F2F6] bg-[#FBFBFD] p-3">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase text-[#9A9CA2]">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
