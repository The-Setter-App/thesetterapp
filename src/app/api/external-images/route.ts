import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  assertSafeRemoteImageTarget,
  parseRemoteImageTarget,
} from "@/lib/media/remoteImageProxy";

const EXTERNAL_IMAGE_CACHE_CONTROL =
  "private, max-age=3600, stale-while-revalidate=86400";

function buildEtag(targetUrl: string): string {
  const hash = crypto.createHash("sha1").update(targetUrl).digest("hex");
  return `"external-image:${hash}"`;
}

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

async function handleExternalImageRequest(
  request: Request,
  method: "GET" | "HEAD",
) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const target = parseRemoteImageTarget(requestUrl.searchParams.get("url"));
  if (!target) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    await assertSafeRemoteImageTarget(target);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Blocked image URL" },
      { status: 400 },
    );
  }

  const etag = buildEtag(target.toString());
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "Cache-Control": EXTERNAL_IMAGE_CACHE_CONTROL,
        ETag: etag,
      },
    });
  }

  const upstream = await fetch(target, {
    method,
    headers: {
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Target is not an image" },
      { status: 400 },
    );
  }

  const headers = new Headers({
    "Cache-Control": EXTERNAL_IMAGE_CACHE_CONTROL,
    "Content-Type": contentType,
    ETag: etag,
    Vary: "Cookie",
  });

  copyHeaderIfPresent(upstream.headers, headers, "content-length");
  copyHeaderIfPresent(upstream.headers, headers, "last-modified");
  copyHeaderIfPresent(upstream.headers, headers, "content-disposition");

  return new NextResponse(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
}

export async function GET(request: Request) {
  return handleExternalImageRequest(request, "GET");
}

export async function HEAD(request: Request) {
  return handleExternalImageRequest(request, "HEAD");
}
