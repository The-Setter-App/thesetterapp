import { BadgeCheck, Shield, Users2 } from 'lucide-react';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';

export default function SettingsTeamPage() {
  return (
    <SettingsSectionCard
      badge="Team"
      title="Team workspace settings"
      description="Manage operator access, collaboration scope, and permission policy."
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2 md:px-8">
        <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users2 size={16} className="text-[#8771FF]" />
            <p className="text-sm font-semibold text-[#101011]">Member Seats</p>
          </div>
          <p className="text-sm text-[#606266]">Invite and assign team members to shared inbox workflows and pipelines.</p>
        </div>
        <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield size={16} className="text-[#8771FF]" />
            <p className="text-sm font-semibold text-[#101011]">Permission Policy</p>
          </div>
          <p className="text-sm text-[#606266]">Define role-based access to account-level actions and connected socials.</p>
        </div>
      </div>
      <div className="border-t border-[#F0F2F6] px-6 py-5 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-2">
          <BadgeCheck size={15} className="text-[#8771FF]" />
          <span className="text-sm font-medium text-[#606266]">Team controls scaffolded and ready for backend wiring</span>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
