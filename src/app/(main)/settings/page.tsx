import { getSession } from '@/lib/auth';
import { getUser, getConnectedInstagramAccounts } from '@/lib/userRepository';
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
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import DisconnectCacheCleanup from '@/components/settings/DisconnectCacheCleanup';
import DisconnectAccountButton from '@/components/settings/DisconnectAccountButton';

export const dynamic = 'force-dynamic';

interface SettingsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await getUser(session.email);
  if (!user) redirect('/login');

  const accounts = await getConnectedInstagramAccounts(session.email);
  const isConnected = accounts.length > 0;

  const params = await searchParams;
  const error = params.error;
  const success = params.success;
  const warning = params.warning;
  const disconnectedAccountId = typeof params.disconnectedAccountId === 'string' ? params.disconnectedAccountId : undefined;
  const missingRaw = params.missing;
  const missingScopes = typeof missingRaw === 'string' ? missingRaw.split(',').filter(Boolean) : [];
  const connectedCountRaw = params.connectedCount;
  const connectedCount = typeof connectedCountRaw === 'string' ? Number.parseInt(connectedCountRaw, 10) : undefined;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <DisconnectCacheCleanup disconnectedAccountId={disconnectedAccountId} />
      <div className="pt-8 max-w-[1000px] mx-auto space-y-8 px-4 md:px-6 pb-20">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-sm">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-stone-600 mt-1">Manage your Instagram connections and application preferences.</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-6 py-4">
            <CircleAlert size={20} className="text-red-600 shrink-0" />
            <p className="text-sm font-medium text-red-700">
              {error === 'missing_required_scopes'
                ? `Missing required permissions: ${missingScopes.join(', ')}`
                : `Error connecting to Instagram: ${error}`}
            </p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4">
            <CircleCheck size={20} className="text-emerald-600 shrink-0" />
            <p className="text-sm font-medium text-emerald-700">
              {success === 'disconnected'
                ? 'Instagram account disconnected successfully.'
                : `Connected Instagram account${connectedCount && connectedCount > 1 ? 's' : ''} successfully${
                    connectedCount ? ` (${connectedCount} found)` : ''
                  }.`}
            </p>
          </div>
        )}

        {warning && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-6 py-4">
            <CircleAlert size={20} className="text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-700">
              Instagram connected, but one or more Page webhook subscriptions failed. Reconnect and check server logs.
            </p>
          </div>
        )}

        <Card noPadding className="overflow-hidden bg-white border border-stone-200 shadow-sm rounded-2xl">
          <div className="px-6 md:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-stone-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                <Instagram size={24} className="text-stone-700" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Instagram Integrations</h3>
                <p className="text-sm text-stone-600 mt-0.5">Sync your Instagram Direct Messages from multiple accounts.</p>
              </div>
            </div>

            {isConnected ? (
              <Badge variant="success" className="px-3 py-1.5 text-sm gap-1.5">
                <Link2 size={14} /> {accounts.length} Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5 bg-stone-100 text-stone-600">
                <Link2Off size={14} /> Not Connected
              </Badge>
            )}
          </div>

          {!isConnected && (
            <div className="px-8 py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-stone-100 border border-stone-200 flex items-center justify-center mb-6 shadow-sm">
                <Link2Off size={28} className="text-stone-400" />
              </div>
              <p className="text-base font-bold mb-2">No Instagram accounts connected</p>
              <p className="text-sm text-stone-600 max-w-sm leading-relaxed">
                Connect your Facebook Pages to start syncing Instagram Direct Messages with Setter.
              </p>
            </div>
          )}

          {isConnected && (
            <div className="px-4 md:px-8 py-4 space-y-4">
              {accounts.map((account) => (
                <div key={account.accountId} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="px-2 py-1 text-xs">
                          Account
                        </Badge>
                        <span className="text-sm font-semibold text-stone-800">
                          {account.instagramUsername ? `@${account.instagramUsername.replace(/^@/, '')}` : account.pageName || 'Unnamed account'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-stone-700">
                          <Hash size={15} className="text-stone-500" />
                          <span className="font-mono text-xs">{account.pageId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-700">
                          <User size={15} className="text-stone-500" />
                          <span className="font-mono text-xs">{account.instagramUserId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-700">
                          <Globe size={15} className="text-stone-500" />
                          <span>{account.graphVersion}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-700">
                          <Clock size={15} className="text-stone-500" />
                          <span>{new Date(account.updatedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-700">
                          <KeyRound size={15} className="text-stone-500" />
                          <span>Token encrypted</span>
                        </div>
                      </div>
                    </div>

                    <DisconnectAccountButton
                      accountId={account.accountId}
                      accountLabel={account.instagramUsername ? `@${account.instagramUsername.replace(/^@/, '')}` : account.pageName || 'this account'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 md:px-8 py-6 bg-stone-100 border-t border-stone-200 flex justify-end">
            <a href="/api/auth/instagram/login" className="inline-block w-full md:w-auto">
              <Button className="w-full md:w-auto" leftIcon={<Plus size={16} />}>
                Add Instagram Account
              </Button>
            </a>
          </div>
        </Card>

        <Card noPadding className="overflow-hidden bg-white border border-stone-200 shadow-sm rounded-2xl">
          <div className="px-6 md:px-8 py-6 border-b border-stone-100">
            <h3 className="text-lg font-bold">Account</h3>
            <p className="text-sm text-stone-600 mt-0.5">Your personal account information.</p>
          </div>
          <div className="px-6 md:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 py-5 border-b border-stone-100">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <User size={18} className="text-stone-500" />
                <span className="text-sm font-medium text-stone-600">Email</span>
              </div>
              <div className="sm:ml-4">
                <span className="text-sm font-mono bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm">
                  {user.email}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 py-5">
              <div className="flex items-center gap-3 sm:w-64 shrink-0">
                <KeyRound size={18} className="text-stone-500" />
                <span className="text-sm font-medium text-stone-600">Role</span>
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
