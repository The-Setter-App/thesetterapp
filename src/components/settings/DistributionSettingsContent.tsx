"use client";

import { CheckCircle2, CircleAlert, Shuffle } from "lucide-react";
import { useState } from "react";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import type { RoundRobinMember } from "@/lib/roundRobinRepository";

interface DistributionSettingsContentProps {
  initialEnabled: boolean;
  initialMembers: RoundRobinMember[];
}

export default function DistributionSettingsContent({
  initialEnabled,
  initialMembers,
}: DistributionSettingsContentProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [members, setMembers] = useState(initialMembers);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);
  const [savingEmail, setSavingEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const totalWeight = members.reduce((sum, member) => sum + member.weight, 0);

  const handleToggle = async () => {
    if (isTogglingEnabled) return;
    const next = !enabled;

    setIsTogglingEnabled(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/settings/round-robin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Failed to update.");
      }
      setEnabled(next);
      setSuccessMessage(
        next
          ? "Round-robin distribution is on."
          : "Round-robin distribution is off — new leads won't be auto-assigned.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update.",
      );
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  const handleWeightChange = async (memberEmail: string, weight: number) => {
    setMembers((current) =>
      current.map((member) =>
        member.email === memberEmail ? { ...member, weight } : member,
      ),
    );
    setSavingEmail(memberEmail);
    setErrorMessage("");

    try {
      const res = await fetch(
        `/api/settings/round-robin/members/${encodeURIComponent(memberEmail)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weight }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Failed to update weight.");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update weight.",
      );
    } finally {
      setSavingEmail(null);
    }
  };

  return (
    <div className="space-y-4">
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-[#D8D2FF] bg-[#F3F0FF] px-5 py-3 text-sm font-medium text-[#6d5ed6]">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
          <CircleAlert size={16} />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <SettingsSectionCard
        title="Lead distribution"
        description="Spread new leads across your setters automatically instead of leaving assignment to whoever replies first."
      >
        <div className="flex items-center justify-between border-b border-[#F0F2F6] px-6 py-6 md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8771FF]/15 text-[#8771FF]">
              <Shuffle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#101011]">
                Round-robin assignment
              </p>
              <p className="text-xs text-[#606266]">
                New leads are assigned to a setter as soon as they message in.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isTogglingEnabled}
            aria-pressed={enabled}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              enabled ? "bg-[#8771FF]" : "bg-[#E4E7EC]"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="px-6 py-6 md:px-8">
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#9B9DA5]">
              No setters on the team yet — add one in Team settings first.
            </p>
          ) : (
            <ul className="divide-y divide-[#F0F2F6]">
              {members.map((member) => {
                const share = totalWeight
                  ? Math.round((member.weight / totalWeight) * 100)
                  : 0;
                return (
                  <li
                    key={member.email}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#101011]">
                        {member.label}
                      </p>
                      <p className="text-xs text-[#9B9DA5]">
                        {member.assignedCount} assigned · ~{share}% of new leads
                        at this weight
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <label
                        htmlFor={`weight-${member.email}`}
                        className="text-xs text-[#606266]"
                      >
                        Weight
                      </label>
                      <input
                        id={`weight-${member.email}`}
                        type="number"
                        min={1}
                        max={10}
                        value={member.weight}
                        disabled={savingEmail === member.email}
                        onChange={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(next)) {
                            handleWeightChange(member.email, next);
                          }
                        }}
                        className="h-9 w-16 rounded-lg border border-[#F0F2F6] bg-white px-2 text-center text-sm text-[#101011] outline-none focus:border-[#8771FF]"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
