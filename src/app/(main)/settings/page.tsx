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
      <div className="pt-4 max-w-[1400px] mx-auto space-y-8 px-4 md:px-6">

        {/* Header */}
        <header>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#f5f3ff] flex items-center justify-center">
              <Settings size={18} className="text-[#8771FF]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-12">
            Manage your Instagram connection and application preferences.
          </p>
        </header>

        {/* Toast Alerts */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4">
            <CircleAlert size={18} className="text-red-500 shrink-0" />
            <p className="text-sm font-medium text-red-700">
              Error connecting to Instagram: {error}
            </p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4">
            <CircleCheck size={18} className="text-emerald-500 shrink-0" />
            <p className="text-sm font-medium text-emerald-700">
              Successfully connected to Instagram!
            </p>
          </div>
        )}

        {/* Instagram Integration Card */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">

          {/* Card Header */}
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f0ecff] to-[#e8e3ff] flex items-center justify-center">
                <Instagram size={20} className="text-[#8771FF]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Instagram Integration</h3>
                <p className="text-sm text-gray-500">Sync your Instagram Direct Messages.</p>
              </div>
            </div>

            {/* Status Badge */}
            {isConnected ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-3.5 py-1.5 w-fit">
                <Link2 size={14} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 w-fit">
                <Link2Off size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500">Not Connected</span>
              </div>
            )}
          </div>

          {/* Connection Details */}
          {isConnected && connectionDetails.length > 0 && (
            <div className="px-6 py-2">
              {connectionDetails.map((detail, index) => {
                const Icon = detail.icon;
                return (
                  <div
                    key={detail.label}
                    className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-4 ${
                      index < connectionDetails.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:w-48 shrink-0">
                      <Icon size={15} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">{detail.label}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-4">
                      <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        {detail.value}
                      </span>
                      {detail.suffix && (
                        <span className="text-xs text-gray-400 font-medium">{detail.suffix}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Not Connected Empty State */}
          {!isConnected && (
            <div className="px-6 py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <Link2Off size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No Instagram account connected</p>
              <p className="text-sm text-gray-400 max-w-sm">
                Connect your Facebook Page to start syncing Instagram Direct Messages with Setter.
              </p>
            </div>
          )}

          {/* Card Footer / Action */}
          <div className="px-6 py-4 bg-[#FAFAFA] border-t border-gray-100">
            <a
              href="/api/auth/instagram/login"
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl shadow-sm transition-all ${
                isConnected
                  ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  : 'bg-[#8771FF] text-white hover:bg-[#7461e6] active:scale-[0.98]'
              }`}
            >
              {isConnected ? (
                <>
                  <RefreshCw size={15} />
                  Reconnect Instagram
                </>
              ) : (
                <>
                  <Instagram size={15} />
                  Connect Instagram
                </>
              )}
            </a>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Account</h3>
            <p className="text-sm text-gray-500">Your account information.</p>
          </div>
          <div className="px-6 py-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5 sm:w-48 shrink-0">
                <User size={15} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Email</span>
              </div>
              <div className="sm:ml-4">
                <span className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 py-4">
              <div className="flex items-center gap-2.5 sm:w-48 shrink-0">
                <KeyRound size={15} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Role</span>
              </div>
              <div className="sm:ml-4">
                <span className="text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}