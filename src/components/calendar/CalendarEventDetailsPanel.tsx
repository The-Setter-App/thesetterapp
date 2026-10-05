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
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
        <h3 className="text-sm font-semibold text-[#101011]">Event details</h3>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F5F8] text-[#606266] outline-none transition-[transform,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:text-[#101011]"
          aria-label="Close event details"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-5 pb-5">
        <span
          className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${typeConfig.bgClass} ${typeConfig.textClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${typeConfig.dotClass}`} />
          {typeConfig.label}
        </span>

        <h4 className="mt-3 text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-[#101011]">
          {event.leadName}
        </h4>
        <p className="mt-1 text-sm text-[#606266]">{event.title}</p>

        {/* The facts share one grouped list, split by hairlines. */}
        <dl className="mt-5 divide-y divide-[#F0F2F6] overflow-hidden rounded-2xl border border-[#F0F2F6]">
          <InfoRow icon={<Clock size={15} aria-hidden="true" />} label="Time">
            <span className="tabular-nums">
              {formatHour(event.startHour)} ·{" "}
              {event.duration >= 1
                ? `${event.duration}h`
                : `${event.duration * 60}m`}
            </span>
          </InfoRow>

          <InfoRow
            icon={<User size={15} aria-hidden="true" />}
            label="Assigned to"
          >
            {event.assignedTo}
          </InfoRow>

          <InfoRow
            icon={<CalendarClock size={15} aria-hidden="true" />}
            label="Status"
          >
            <span
              className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}
            >
              {statusConfig.label}
            </span>
          </InfoRow>

          {event.amount ? (
            <InfoRow
              icon={<DollarSign size={15} aria-hidden="true" />}
              label="Deal value"
            >
              <span className="font-semibold tabular-nums">{event.amount}</span>
            </InfoRow>
          ) : null}
        </dl>

        <section className="mt-4 rounded-2xl bg-[#F8F7FF] p-4">
          <div className="flex items-center justify-between gap-2">
            <h5 className="flex items-center gap-2 text-sm font-semibold text-[#101011]">
              <FileText
                size={15}
                aria-hidden="true"
                className="text-[#8771FF]"
              />
              Pre-call answers
            </h5>
            {preCallAnswers.length > 0 ? (
              <span className="inline-flex h-6 items-center rounded-full bg-white px-2.5 text-[11px] font-semibold text-[#8771FF] tabular-nums">
                {preCallAnswers.length} captured
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[0.8125rem] leading-snug text-[#606266]">
            Quick context pulled from Calendly before the call.
          </p>

          <div className="mt-3">
            {detailLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-white/80" />
            ) : detailError ? (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {detailError}
              </div>
            ) : previewAnswer ? (
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-medium text-[#9A9CA2]">
                  {previewAnswer.question}
                </p>
                <p className="mt-1.5 break-words text-sm font-medium leading-relaxed text-[#101011]">
                  {truncateAnswer(previewAnswer.answer)}
                </p>
                {extraAnswersCount > 0 ? (
                  <p className="mt-2.5 text-xs font-medium text-[#8771FF]">
                    +{extraAnswersCount} more answer
                    {extraAnswersCount === 1 ? "" : "s"} in full intake
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="rounded-2xl bg-white p-4 text-[0.8125rem] leading-snug text-[#606266]">
                {detail?.preCallAnswersStatus === "unavailable"
                  ? "Pre-call answers are unavailable for this booking."
                  : "No pre-call answers were captured for this booking."}
              </p>
            )}
          </div>

          {preCallAnswers.length > 0 ? (
            <Button
              type="button"
              className="mt-3 h-11 w-full rounded-full text-sm font-semibold"
              onClick={() => setIntakeOpen(true)}
              rightIcon={<FolderOpen size={16} aria-hidden="true" />}
            >
              Open full intake
            </Button>
          ) : null}
        </section>
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

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

function InfoRow({ icon, label, children }: InfoRowProps) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2.5">
      <dt className="flex items-center gap-2.5 text-[0.8125rem] text-[#606266]">
        <span className="text-[#9A9CA2]">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm font-medium text-[#101011]">
        {children}
      </dd>
    </div>
  );
}
