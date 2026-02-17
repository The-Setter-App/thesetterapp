import { KeyRound, User } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import type { User as AppUser } from '@/types/auth';

export default function ProfileSettingsContent({ user }: { user: AppUser }) {
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  return (
    <SettingsSectionCard
      badge="Profile"
      title="Your account details"
      description="Identity and role information for this workspace account."
    >
      <div className="px-6 py-4 md:px-8">
        <div className="flex flex-col gap-2 border-b border-[#F0F2F6] py-5 sm:flex-row sm:items-center sm:gap-0">
          <div className="flex shrink-0 items-center gap-3 sm:w-64">
            <User size={18} className="text-[#606266]" />
            <span className="text-sm font-medium text-[#606266]">Email</span>
          </div>
          <div className="sm:ml-4">
            <span className="rounded-lg border border-[#F0F2F6] bg-[#F8F7FF] px-3 py-1.5 font-mono text-sm shadow-sm">{user.email}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:gap-0">
          <div className="flex shrink-0 items-center gap-3 sm:w-64">
            <KeyRound size={18} className="text-[#606266]" />
            <span className="text-sm font-medium text-[#606266]">Role</span>
          </div>
          <div className="sm:ml-4">
            <Badge variant="outline" className="border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-1 text-sm capitalize text-[#8771FF]">
              {roleLabel}
            </Badge>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
