import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  assertSafeRemoteImageTarget,
  parseRemoteImageTarget,
} from "@/lib/media/remoteImageProxy";

const EXTERNAL_MEDIA_CACHE_CONTROL =
  "private, max-age=3600, stale-while-revalidate=86400";

function copyHeaderIfPresent(
  source: Headers,
  target: Headers,
  headerName: string,
): void {
  const value = source.get(headerName);
  if (value) {
    target.set(headerName, value);
  }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const target = parseRemoteImageTarget(requestUrl.searchParams.get("url"));
  if (!target) {
    return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
  }

  try {
    await assertSafeRemoteImageTarget(target);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blocked media URL" },
      { status: 400 },
    );
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");
  if (range) {
    upstreamHeaders.set("Range", range);
  }

  const upstream = await fetch(target, {
    headers: upstreamHeaders,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: "Failed to fetch media" },
      {
        status:
          upstream.status >= 400 && upstream.status < 600
            ? upstream.status
            : 502,
      },
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Cache-Control", EXTERNAL_MEDIA_CACHE_CONTROL);
  responseHeaders.set("Vary", "Cookie, Range");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "content-type");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "content-length");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "content-range");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "accept-ranges");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "content-disposition");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "etag");
  copyHeaderIfPresent(upstream.headers, responseHeaders, "last-modified");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
