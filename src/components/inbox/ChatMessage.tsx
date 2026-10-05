import { LuFileText } from "react-icons/lu";
import { AppImage } from "@/components/ui/AppImage";
import { resolveAppMediaSrc } from "@/lib/media/remoteMediaUrl";
import type { Message } from "@/types/inbox";
import AudioMessage from "./AudioMessage";
import MessageMarkdown from "./MessageMarkdown";

interface ChatMessageProps {
  message: Message;
  // Whether the image or video has finished loading; until then a
  // placeholder holds its space.
  mediaLoaded: boolean;
  // The media can now be shown at its real size.
  onMediaLoaded: () => void;
  // The media changed height without changing its loaded state.
  onMediaResized: () => void;
  onOpenImage: (url: string) => void;
  onAudioDurationResolved?: (messageId: string, duration: string) => void;
}

const MEDIA_FRAME_CLASS =
  "relative w-[220px] overflow-hidden rounded-2xl bg-[#F4F5F8] sm:w-[260px] md:w-[320px]";

// Images and voice notes carry their own shape; everything else sits in a
// bubble whose tail corner points at its sender.
function getBubbleClassName(message: Message): string {
  if (message.type === "audio" || message.type === "image") {
    return "bg-transparent p-0";
  }

  const tone = message.fromMe
    ? "rounded-br-md bg-[#8771FF] text-white"
    : "rounded-bl-md bg-[#F4F5F8] text-[#101011]";
  const padding = message.type === "video" ? "p-1" : "px-3.5 py-2";

  return `max-w-[78%] rounded-[1.25rem] ${tone} ${padding}`;
}

export default function ChatMessage({
  message,
  mediaLoaded,
  onMediaLoaded,
  onMediaResized,
  onOpenImage,
  onAudioDurationResolved,
}: ChatMessageProps) {
  const resolvedAttachmentUrl =
    resolveAppMediaSrc(message.attachmentUrl) || message.attachmentUrl;

  return (
    <div
      className={`flex flex-col ${message.fromMe ? "items-end" : "items-start"}`}
    >
      <div
        className={`text-[0.9375rem] leading-[1.4] ${getBubbleClassName(message)}`}
      >
        {message.type === "text" && (
          <MessageMarkdown fromMe={message.fromMe} text={message.text || ""} />
        )}

        {message.type === "image" && message.attachmentUrl && (
          <div>
            <div
              className={`${MEDIA_FRAME_CLASS} ${mediaLoaded ? "" : "min-h-[220px]"}`}
            >
              {!mediaLoaded && (
                <div className="absolute inset-0 animate-pulse bg-[#F0F2F6]/70" />
              )}
              <AppImage
                src={resolvedAttachmentUrl}
                alt="Attachment"
                className={`block h-auto w-full cursor-pointer transition-opacity duration-300 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
                loadingMode="lazy"
                onLoad={onMediaLoaded}
                onClick={() => {
                  if (resolvedAttachmentUrl) onOpenImage(resolvedAttachmentUrl);
                }}
              />
            </div>
            {message.text && (
              <p
                className={`mt-1 text-xs text-[#606266] ${message.fromMe ? "text-right" : "text-left"}`}
              >
                {message.text}
              </p>
            )}
          </div>
        )}
        {message.type === "image" && !message.attachmentUrl && (
          <div className="rounded-2xl bg-[#F4F5F8] px-3.5 py-2 text-xs text-[#606266]">
            Image unavailable
          </div>
        )}

        {message.type === "video" && message.attachmentUrl && (
          <div>
            <div
              className={`${MEDIA_FRAME_CLASS} ${mediaLoaded ? "" : "min-h-[220px]"}`}
            >
              {!mediaLoaded && (
                <div className="absolute inset-0 animate-pulse bg-[#F0F2F6]/70" />
              )}
              <video
                src={resolvedAttachmentUrl}
                controls
                muted
                onLoadedMetadata={onMediaLoaded}
                onLoadedData={onMediaResized}
                className={`block h-auto w-full transition-opacity duration-300 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
              >
                <track kind="captions" />
              </video>
            </div>
            {message.text && <p className="px-2.5 py-2">{message.text}</p>}
          </div>
        )}

        {message.type === "audio" && (
          <AudioMessage
            messageId={message.id}
            src={resolvedAttachmentUrl || ""}
            duration={message.duration}
            isOwn={message.fromMe}
            onDurationResolved={onAudioDurationResolved}
          />
        )}

        {message.type === "file" && (
          <div className="flex items-center gap-2">
            <LuFileText aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>{message.text || "File attachment"}</span>
          </div>
        )}
      </div>

      {message.pending && !message.clientAcked && message.fromMe && (
        <p className="mr-1 mt-1 text-[11px] text-[#9A9CA2]">Sending...</p>
      )}
      {message.status === "Read" && (
        <p className="mr-1 mt-1 text-[11px] text-[#9A9CA2]">Read</p>
      )}
    </div>
  );
}
