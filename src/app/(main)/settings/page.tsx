import { getSession } from '@/lib/auth';
import { getUser } from '@/lib/userRepository';
import { redirect } from 'next/navigation';
import { User } from '@/types/auth';

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your Instagram connection and application preferences.</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error connecting to Instagram: {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Successfully connected to Instagram!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Instagram Integration
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Connect your Facebook Page to sync Instagram Direct Messages.</p>
          </div>

          <div className="mt-5 border-t border-gray-200 pt-5">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Connection Status</dt>
                <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {isConnected ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Not Connected
                    </span>
                  )}
                </dd>
              </div>

              {isConnected && config && (
                <>
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Facebook Page ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={config.pageId} 
                        className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </dd>
                  </div>

                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Instagram User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={config.instagramUserId} 
                        className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </dd>
                  </div>

                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Graph API Version</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={config.graphVersion} 
                        className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </dd>
                  </div>

                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Access Token</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <div className="flex items-center">
                        <input 
                          type="text" 
                          readOnly 
                          value="********************************" 
                          className="flex-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-xs text-gray-400">(Encrypted)</span>
                      </div>
                    </dd>
                  </div>
                  
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {new Date(config.updatedAt).toLocaleString()}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <a
            href="/api/auth/instagram/login"
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isConnected ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
          >
            {isConnected ? 'Reconnect Instagram' : 'Connect Instagram'}
          </a>
        </div>
      </div>
    </div>
  );
}