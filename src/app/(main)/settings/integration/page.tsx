import { Activity, CheckCircle2, Radio, Webhook } from 'lucide-react';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard';
import { requireCurrentUser } from '@/lib/currentUser';
import { getCachedConnectedInstagramAccounts } from '@/lib/settingsCache';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SettingsIntegrationPage() {
  const { session, user } = await requireCurrentUser();
  if (user.role !== 'owner') {
    redirect(user.role === 'viewer' ? '/settings/profile' : '/settings/team');
  }
  const accounts = await getCachedConnectedInstagramAccounts(session.email);
  const isConnected = accounts.length > 0;

  return (
    <SettingsSectionCard
      badge="Integration"
      title="Platform integrations"
      description="Observe the current state of social sync and webhooks."
    >
      <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2 md:px-8">
        <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Activity size={16} className="text-[#8771FF]" />
            <p className="text-sm font-semibold text-[#101011]">Social Connection Status</p>
          </div>
          <p className="text-base font-bold text-[#101011]">{isConnected ? 'Connected' : 'Not Connected'}</p>
          <p className="mt-1 text-sm text-[#606266]">
            {isConnected ? `${accounts.length} Instagram account${accounts.length > 1 ? 's' : ''} linked` : 'No Instagram account is currently linked'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#F0F2F6] bg-[#F8F7FF] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Webhook size={16} className="text-[#8771FF]" />
            <p className="text-sm font-semibold text-[#101011]">Webhook Sync</p>
          </div>
          <p className="text-base font-bold text-[#101011]">{isConnected ? 'Active' : 'Pending Setup'}</p>
          <p className="mt-1 text-sm text-[#606266]">Webhook activity depends on connected Instagram business accounts.</p>
        </div>
      </div>

      <div className="border-t border-[#F0F2F6] px-6 py-5 md:px-8">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-2">
            <div className="mb-1 flex items-center gap-2 text-[#8771FF]">
              <CheckCircle2 size={14} />
              <span className="text-xs font-semibold uppercase">Auth</span>
            </div>
            <p className="text-sm font-medium text-[#101011]">{isConnected ? 'Healthy' : 'Waiting'}</p>
          </div>
          <div className="rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-2">
            <div className="mb-1 flex items-center gap-2 text-[#8771FF]">
              <Radio size={14} />
              <span className="text-xs font-semibold uppercase">Events</span>
            </div>
            <p className="text-sm font-medium text-[#101011]">{isConnected ? 'Streaming' : 'Idle'}</p>
          </div>
          <div className="rounded-xl border border-[#F0F2F6] bg-[rgba(135,113,255,0.1)] px-3 py-2">
            <div className="mb-1 flex items-center gap-2 text-[#8771FF]">
              <Activity size={14} />
              <span className="text-xs font-semibold uppercase">Sync</span>
            </div>
            <p className="text-sm font-medium text-[#101011]">{isConnected ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
