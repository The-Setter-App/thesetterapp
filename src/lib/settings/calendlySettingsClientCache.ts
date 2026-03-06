"use client";

interface CalendlySettingsState {
  connected: boolean;
  connectedAt?: string;
  schedulingUrl?: string;
  credentialPreview?: string;
}

interface CachedCalendlySettingsState {
  state: CalendlySettingsState;
  fetchedAt: number;
}

const CACHE_KEY = "setterapp_calendly_settings_state";
const CACHE_TTL_MS = 2 * 60 * 1000;

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function getCachedCalendlySettingsState(): {
  state: CalendlySettingsState | null;
  fresh: boolean;
} {
  const storage = getStorage();
  if (!storage) {
    return { state: null, fresh: false };
  }

  const rawValue = storage.getItem(CACHE_KEY);
  if (!rawValue) {
    return { state: null, fresh: false };
  }

  try {
    const parsed = JSON.parse(rawValue) as CachedCalendlySettingsState;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.state ||
      typeof parsed.fetchedAt !== "number"
    ) {
      storage.removeItem(CACHE_KEY);
      return { state: null, fresh: false };
    }

    const fresh = Date.now() - parsed.fetchedAt <= CACHE_TTL_MS;
    return { state: parsed.state, fresh };
  } catch {
    storage.removeItem(CACHE_KEY);
    return { state: null, fresh: false };
  }
}

export function setCachedCalendlySettingsState(
  state: CalendlySettingsState,
): void {
  const storage = getStorage();
  if (!storage) return;

  const payload: CachedCalendlySettingsState = {
    state,
    fetchedAt: Date.now(),
  };
  storage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function clearCachedCalendlySettingsState(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(CACHE_KEY);
}
