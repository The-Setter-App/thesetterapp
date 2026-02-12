import { getSession } from '@/lib/auth';
import { getUser } from '@/lib/userRepository';
import { redirect } from 'next/navigation';
import {
  Settings,
  Instagram,
  Link2,
  Link2Off,
  Hash,
  User,
  Globe,
  KeyRound,
  Clock,
  CircleAlert,
  CircleCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await getUser(session.email);
  if (!user) redirect('/login');

  const config = user.instagramConfig;
  const isConnected = config?.isConnected ?? false;

  const params = await searchParams;
  const error = params.error;
  const success = params.success;

  const connectionDetails = isConnected && config ? [
    { label: 'Facebook Page ID', value: config.pageId, icon: Hash },
    { label: 'Instagram User ID', value: config.instagramUserId, icon: User },
    { label: 'Graph API Version', value: config.graphVersion, icon: Globe },
    { label: 'Access Token', value: '••••••••••••••••••••••••', icon: KeyRound, suffix: 'Encrypted' },
    { label: 'Last Updated', value: new Date(config.updatedAt).toLocaleString(), icon: Clock },
  ] : [];

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <div className="pt-8 max-w-[1000px] mx-auto space-y-8 px-6 pb-20">

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] flex items-center justify-center shadow-sm">
              <Settings size={24} className="text-[#8771FF]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
              <p className="text-gray-500 mt-1">
                Manage your Instagram connection and application preferences.
              </p>
            </div>
          </div>
        </header>

        {/* Toast Alerts */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-top-2">
            <CircleAlert size={20} className="text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-700">
              Error connecting to Instagram: {error}
            </p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-top-2">
            <CircleCheck size={20} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-700">
              Successfully connected to Instagram!
            </p>
          </div>
        )}

        {/* Instagram Integration Card */}
        <Card noPadding className="overflow-hidden">
          {/* Card Header */}
          <div className="px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f0ecff] to-[#e8e3ff] flex items-center justify-center shadow-inner">
                <Instagram size={24} className="text-[#8771FF]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Instagram Integration</h3>
                <p className="text-sm text-gray-500 mt-0.5">Sync your Instagram Direct Messages.</p>
              </div>
            </div>

            {/* Status Badge */}
            {isConnected ? (
              <Badge variant="success" className="px-3 py-1.5 text-sm gap-1.5">
                <Link2 size={14} /> Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5 bg-gray-50 text-gray-500">
                <Link2Off size={14} /> Not Connected
              </Badge>
            )}
          </div>

          {/* Connection Details */}
          {isConnected && connectionDetails.length > 0 && (
            <div className="px-8 py-4">
              {connectionDetails.map((detail, index) => {
                const Icon = detail.icon;
                return (
                  <div
                    key={detail.label}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 py-5 ${
                      index < connectionDetails.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:w-64 shrink-0">
                      <Icon size={18} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-600">{detail.label}</span>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-4">
                      <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                        {detail.value}
                      </span>
                      {detail.suffix && (
                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-md">{detail.suffix}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Not Connected Empty State */}
          {!isConnected && (
            <div className="px-8 py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-6 shadow-sm">
                <Link2Off size={28} className="text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-900 mb-2">No Instagram account connected</p>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                Connect your Facebook Page to start syncing Instagram Direct Messages with Setter.
              </p>
            </div>
          )}

          {/* Card Footer / Action */}
          <div className="px-8 py-6 bg-[#FAFAFA] border-t border-gray-100 flex justify-end">
            <a href="/api/auth/instagram/login" className="inline-block">
               {isConnected ? (
                 <Button variant="outline" className="bg-white" leftIcon={<RefreshCw size={16} />}>
                   Reconnect Instagram
                 </Button>
               ) : (
                 <Button leftIcon={<Instagram size={16} />}>
                   Connect Instagram
                 </Button>
               )}
            </a>
          </div>
        </Card>

        {/* Account Info Card */}
        <Card noPadding className="overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Account</h3>
            <p className="text-sm text-gray-500 mt-0.5">Your personal account information.</p>
          </div>
          <div className="px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 py-5 border-b border-gray-50">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <User size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Email</span>
              </div>
              <div className="sm:ml-4">
                <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 py-5">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <KeyRound size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Role</span>
              </div>
              <div className="sm:ml-4">
                <Badge variant="secondary" className="px-3 py-1 text-sm capitalize">
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}