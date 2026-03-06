import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const PROFILE_IMAGE_CACHE_CONTROL = "private, max-age=2592000, immutable";
const PROFILE_IMAGES_BUCKET = "profile-images";

function buildEtag(objectPath: string): string {
  return `"profile-image:${encodeURIComponent(objectPath)}"`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const session = await getSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await context.params;
  if (!Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: "Image path is required" }, { status: 400 });
  }

  const objectPath = path.join("/");
  const etag = buildEtag(objectPath);
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        "Cache-Control": PROFILE_IMAGE_CACHE_CONTROL,
        ETag: etag,
      },
    });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .download(objectPath);

  if (error || !data) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Cache-Control": PROFILE_IMAGE_CACHE_CONTROL,
      "Content-Length": String(data.size),
      "Content-Type": data.type || "application/octet-stream",
      ETag: etag,
      Vary: "Cookie",
    },
  });
}
