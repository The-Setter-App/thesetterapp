import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import {
  getCachedRemoteTargetSafety,
  setCachedRemoteTargetSafety,
} from "@/lib/media/remoteTargetSafetyCache";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isRemoteHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map((segment) => Number.parseInt(segment, 10));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true;
}

export function parseRemoteImageTarget(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;
  if (!isRemoteHttpUrl(rawUrl)) return null;

  const target = new URL(rawUrl);
  if (LOCAL_HOSTNAMES.has(target.hostname.toLowerCase())) {
    return null;
  }

  return target;
}

export async function assertSafeRemoteImageTarget(target: URL): Promise<void> {
  const hostname = target.hostname.toLowerCase();
  const cachedSafety = getCachedRemoteTargetSafety(hostname);
  if (cachedSafety === true) {
    return;
  }
  if (cachedSafety === false) {
    throw new Error("Private image targets are not allowed");
  }

  if (LOCAL_HOSTNAMES.has(hostname)) {
    setCachedRemoteTargetSafety(hostname, false);
    throw new Error("Local image targets are not allowed");
  }

  if (isIP(hostname) && isPrivateIp(hostname)) {
    setCachedRemoteTargetSafety(hostname, false);
    throw new Error("Private image targets are not allowed");
  }

  if (!isIP(hostname)) {
    const records = await lookup(hostname, { all: true });
    if (!records.length) {
      setCachedRemoteTargetSafety(hostname, false);
      throw new Error("Unable to resolve image host");
    }
    for (const record of records) {
      if (isPrivateIp(record.address)) {
        setCachedRemoteTargetSafety(hostname, false);
        throw new Error("Private image targets are not allowed");
      }
    }
  }

  setCachedRemoteTargetSafety(hostname, true);
}
