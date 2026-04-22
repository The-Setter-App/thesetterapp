import { type NextRequest, NextResponse } from "next/server";
import { getVoiceNoteBinaryForMessage } from "@/lib/inboxRepository";
import { AccessError, requireInboxWorkspaceContext } from "@/lib/workspace";

const AUDIO_CACHE_CONTROL = "private, max-age=2592000, immutable";

function toBlobPart(buffer: Buffer): ArrayBuffer {
  return Uint8Array.from(buffer).buffer;
}

function buildAudioEtag(messageId: string): string {
  return `"voice-note:${messageId}"`;
}

function parseRangeHeader(
  rangeHeader: string | null,
  size: number,
): {
  start: number;
  end: number;
} | null {
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) return null;

  const [startValue, endValue] = rangeHeader
    .replace("bytes=", "")
    .split("-", 2);
  const start = startValue ? Number.parseInt(startValue, 10) : Number.NaN;
  const end = endValue ? Number.parseInt(endValue, 10) : Number.NaN;

  if (Number.isNaN(start) && Number.isNaN(end)) return null;

  if (Number.isNaN(start)) {
    const suffixLength = end;
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1,
    };
  }

  if (start < 0 || start >= size) return null;
  const resolvedEnd = Number.isNaN(end) ? size - 1 : Math.min(end, size - 1);
  if (resolvedEnd < start) return null;

  return { start, end: resolvedEnd };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> },
) {
  try {
    const { workspaceOwnerEmail } = await requireInboxWorkspaceContext();

    const { messageId } = await context.params;
    const audio = await getVoiceNoteBinaryForMessage(
      messageId,
      workspaceOwnerEmail,
    );
    if (!audio) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const etag = buildAudioEtag(messageId);
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": AUDIO_CACHE_CONTROL,
          ETag: etag,
        },
      });
    }

    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": AUDIO_CACHE_CONTROL,
      "Content-Type": audio.mimeType,
      ETag: etag,
    });

    const range = parseRangeHeader(request.headers.get("range"), audio.size);
    if (range) {
      const chunk = audio.buffer.subarray(range.start, range.end + 1);
      headers.set("Content-Length", String(chunk.length));
      headers.set(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${audio.size}`,
      );

      return new NextResponse(
        new Blob([toBlobPart(chunk)], { type: audio.mimeType }),
        {
          status: 206,
          headers,
        },
      );
    }

    headers.set("Content-Length", String(audio.size));
    return new NextResponse(
      new Blob([toBlobPart(audio.buffer)], { type: audio.mimeType }),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[AudioStreamAPI] Failed to stream voice note:", error);
    return NextResponse.json(
      { error: "Failed to stream audio" },
      { status: 500 },
    );
  }
}
