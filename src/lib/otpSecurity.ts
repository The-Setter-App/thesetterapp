import { getSupabaseServerClient } from '@/lib/supabase/server';

type OtpRateLimitAction = 'send' | 'verify';

interface OtpRateLimitRow {
  key: string;
  action: OtpRateLimitAction;
  count: number;
  window_started_at: string;
  blocked_until: string | null;
  updated_at: string;
}

interface OtpRateLimitPolicy {
  windowSeconds: number;
  maxAttempts: number;
  blockSeconds: number;
}

export interface OtpRateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

const DEFAULT_SEND_POLICY: OtpRateLimitPolicy = {
  windowSeconds: 600,
  maxAttempts: 3,
  blockSeconds: 900,
};

const DEFAULT_VERIFY_POLICY: OtpRateLimitPolicy = {
  windowSeconds: 600,
  maxAttempts: 10,
  blockSeconds: 900,
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getPolicy(action: OtpRateLimitAction): OtpRateLimitPolicy {
  if (action === 'send') {
    return {
      windowSeconds: parsePositiveInt(
        process.env.OTP_SEND_LIMIT_WINDOW_SECONDS,
        DEFAULT_SEND_POLICY.windowSeconds,
      ),
      maxAttempts: parsePositiveInt(
        process.env.OTP_SEND_MAX_ATTEMPTS,
        DEFAULT_SEND_POLICY.maxAttempts,
      ),
      blockSeconds: parsePositiveInt(
        process.env.OTP_SEND_BLOCK_SECONDS,
        DEFAULT_SEND_POLICY.blockSeconds,
      ),
    };
  }

  return {
    windowSeconds: parsePositiveInt(
      process.env.OTP_VERIFY_LIMIT_WINDOW_SECONDS,
      DEFAULT_VERIFY_POLICY.windowSeconds,
    ),
    maxAttempts: parsePositiveInt(
      process.env.OTP_VERIFY_MAX_ATTEMPTS,
      DEFAULT_VERIFY_POLICY.maxAttempts,
    ),
    blockSeconds: parsePositiveInt(
      process.env.OTP_VERIFY_BLOCK_SECONDS,
      DEFAULT_VERIFY_POLICY.blockSeconds,
    ),
  };
}

function getRetryAfterSeconds(blockedUntil: Date, now: Date): number {
  const seconds = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
  return seconds > 0 ? seconds : 1;
}

function buildRateLimitKey(action: OtpRateLimitAction, scope: 'email' | 'ip', value: string): string {
  return `otp:${action}:${scope}:${value}`;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

async function consumeRateLimitKey(
  action: OtpRateLimitAction,
  key: string,
): Promise<OtpRateLimitDecision> {
  const supabase = getSupabaseServerClient();
  const policy = getPolicy(action);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data } = await supabase
    .from('otp_rate_limits')
    .select('key,action,count,window_started_at,blocked_until,updated_at')
    .eq('key', key)
    .maybeSingle();

  const row = data as OtpRateLimitRow | null;
  if (!row) {
    await supabase.from('otp_rate_limits').insert({
      key,
      action,
      count: 1,
      window_started_at: nowIso,
      blocked_until: null,
      updated_at: nowIso,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.blocked_until) {
    const blockedUntil = new Date(row.blocked_until);
    if (blockedUntil.getTime() > now.getTime()) {
      return {
        allowed: false,
        retryAfterSeconds: getRetryAfterSeconds(blockedUntil, now),
      };
    }
  }

  const windowStartedAt = new Date(row.window_started_at);
  const windowExpiresAt = new Date(windowStartedAt.getTime() + policy.windowSeconds * 1000);

  if (windowExpiresAt.getTime() <= now.getTime()) {
    await supabase
      .from('otp_rate_limits')
      .update({
        count: 1,
        window_started_at: nowIso,
        blocked_until: null,
        updated_at: nowIso,
      })
      .eq('key', key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const nextCount = row.count + 1;
  if (nextCount > policy.maxAttempts) {
    const blockedUntil = new Date(now.getTime() + policy.blockSeconds * 1000);
    await supabase
      .from('otp_rate_limits')
      .update({
        count: nextCount,
        blocked_until: blockedUntil.toISOString(),
        updated_at: nowIso,
      })
      .eq('key', key);

    return {
      allowed: false,
      retryAfterSeconds: policy.blockSeconds,
    };
  }

  await supabase
    .from('otp_rate_limits')
    .update({
      count: nextCount,
      blocked_until: null,
      updated_at: nowIso,
    })
    .eq('key', key);

  return { allowed: true, retryAfterSeconds: 0 };
}

async function enforceRateLimitKeys(
  action: OtpRateLimitAction,
  keys: string[],
): Promise<OtpRateLimitDecision> {
  let maxRetryAfterSeconds = 0;

  for (const key of keys) {
    const decision = await consumeRateLimitKey(action, key);
    if (!decision.allowed) {
      if (decision.retryAfterSeconds > maxRetryAfterSeconds) {
        maxRetryAfterSeconds = decision.retryAfterSeconds;
      }
      return {
        allowed: false,
        retryAfterSeconds: maxRetryAfterSeconds,
      };
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function enforceOtpSendRateLimit(
  email: string,
  ipAddress: string,
): Promise<OtpRateLimitDecision> {
  return enforceRateLimitKeys('send', [
    buildRateLimitKey('send', 'email', email),
    buildRateLimitKey('send', 'ip', ipAddress),
  ]);
}

export async function enforceOtpVerifyRateLimit(
  email: string,
  ipAddress: string,
): Promise<OtpRateLimitDecision> {
  return enforceRateLimitKeys('verify', [
    buildRateLimitKey('verify', 'email', email),
    buildRateLimitKey('verify', 'ip', ipAddress),
  ]);
}

export async function resetOtpVerifyEmailLimit(email: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase
    .from('otp_rate_limits')
    .delete()
    .eq('key', buildRateLimitKey('verify', 'email', email));
}
