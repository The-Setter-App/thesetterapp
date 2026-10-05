"use client";

import { useState } from "react";
import SettingsNotice from "@/components/settings/SettingsNotice";
import SettingsSectionCard from "@/components/settings/SettingsSectionCard";
import SettingsSwitch from "@/components/settings/SettingsSwitch";
import {
  SETTINGS_BLOCK_CLASS,
  SETTINGS_INPUT_CLASS,
} from "@/components/settings/settingsStyles";
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
          : "Round-robin distribution is off. New leads will not be assigned automatically.",
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
    <div className="space-y-3">
      {successMessage ? (
        <SettingsNotice tone="success">{successMessage}</SettingsNotice>
      ) : null}
      {errorMessage ? (
        <SettingsNotice tone="error">{errorMessage}</SettingsNotice>
      ) : null}

      <SettingsSectionCard
        id="lead-distribution"
        title="Lead distribution"
        description="Share new leads across your setters automatically, instead of leaving them to whoever replies first."
      >
        <div
          className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-4`}
        >
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-medium text-[#101011]">
              Round-robin assignment
            </p>
            <p className="mt-0.5 text-sm leading-snug text-[#606266]">
              Each new lead is given to a setter as soon as they message in.
            </p>
          </div>
          <SettingsSwitch
            checked={enabled}
            onChange={handleToggle}
            disabled={isTogglingEnabled}
            label="Round-robin assignment"
          />
        </div>

        {members.length === 0 ? (
          <p
            className={`${SETTINGS_BLOCK_CLASS} border-t border-[#F0F2F6] text-sm text-[#606266]`}
          >
            No setters on the team yet. Invite one above and they will appear
            here.
          </p>
        ) : (
          <ul
            className={`divide-y divide-[#F0F2F6] border-t border-[#F0F2F6] transition-opacity duration-200 ${
              enabled ? "" : "opacity-60"
            }`}
          >
            {members.map((member) => {
              const share = totalWeight
                ? Math.round((member.weight / totalWeight) * 100)
                : 0;
              return (
                <li
                  key={member.email}
                  className={`${SETTINGS_BLOCK_CLASS} flex items-center justify-between gap-4 !py-3.5`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-medium text-[#101011]">
                      {member.label}
                    </p>
                    <p className="text-xs tabular-nums text-[#9A9CA2]">
                      {member.assignedCount} assigned · about {share}% of new
                      leads
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label
                      htmlFor={`weight-${member.email}`}
                      className="text-xs font-medium text-[#606266]"
                    >
                      Weight
                    </label>
                    <input
                      id={`weight-${member.email}`}
                      type="number"
                      inputMode="numeric"
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
                      className={`${SETTINGS_INPUT_CLASS} !w-16 !px-2 text-center tabular-nums`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSectionCard>
    </div>
  );
}
