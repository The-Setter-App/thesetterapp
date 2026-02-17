import { redirect } from 'next/navigation';

interface SettingsRootPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function buildQueryString(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') query.set(key, value);
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
  });

  const asString = query.toString();
  return asString ? `?${asString}` : '';
}

export default async function SettingsRootPage({ searchParams }: SettingsRootPageProps) {
  const params = await searchParams;
  const hasSocialState = Boolean(params.error || params.success || params.warning || params.disconnectedAccountId || params.missing || params.connectedCount);
  const destination = hasSocialState ? '/settings/socials' : '/settings/profile';
  redirect(`${destination}${buildQueryString(params)}`);
}
