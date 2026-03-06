type CachedRemoteTargetSafety = {
  safe: boolean;
  expiresAt: number;
};

const REMOTE_TARGET_SAFETY_TTL_MS = 10 * 60 * 1000;
const remoteTargetSafetyCache = new Map<string, CachedRemoteTargetSafety>();

export function getCachedRemoteTargetSafety(hostname: string): boolean | null {
  const cached = remoteTargetSafetyCache.get(hostname);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    remoteTargetSafetyCache.delete(hostname);
    return null;
  }
  return cached.safe;
}

export function setCachedRemoteTargetSafety(hostname: string, safe: boolean): void {
  remoteTargetSafetyCache.set(hostname, {
    safe,
    expiresAt: Date.now() + REMOTE_TARGET_SAFETY_TTL_MS,
  });
}
