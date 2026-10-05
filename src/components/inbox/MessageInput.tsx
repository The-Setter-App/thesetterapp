"use client";

import { useEffect, useRef } from "react";
import {
  LuArrowUp,
  LuCalendarPlus,
  LuCheck,
  LuImage,
  LuMic,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { AppImage } from "@/components/ui/AppImage";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { User } from "@/types/inbox";

interface MessageInputProps {
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  user: User | null;
  attachmentFile: File | null;
  attachmentPreview: string;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAttachmentPaste: (file: File) => void;
  clearAttachment: () => void;
  handleSendAudio?: (blob: Blob, duration: number) => void;
  showCalendlyButton?: boolean;
  onOpenCalendlyModal?: () => void;
  // Changing this number puts the cursor in the message field, at the end of
  // whatever text it holds. Used after a suggested reply is dropped in.
  focusRequest?: number;
}

const MAX_TEXTAREA_HEIGHT_PX = 120;

const TOOL_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none transition-[transform,color,background-color] duration-100 ease-out active:scale-[0.94] disabled:opacity-50";
const TOOL_BUTTON_IDLE_CLASS =
  "text-[#9A9CA2] [@media(hover:hover)]:enabled:hover:bg-[#F8F7FF] [@media(hover:hover)]:enabled:hover:text-[#606266]";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function MessageInput({
  messageInput,
  setMessageInput,
  handleSendMessage,
  user,
  attachmentFile,
  attachmentPreview,
  handleFileSelect,
  handleAttachmentPaste,
  clearAttachment,
  handleSendAudio,
  showCalendlyButton = false,
  onOpenCalendlyModal,
  focusRequest = 0,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Grow the field with its content, up to a few lines. Re-measured whenever
  // the text changes, including when it is cleared after sending.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the text is the trigger; the measurement reads the DOM.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [messageInput, isRecording]);

  useEffect(() => {
    if (focusRequest === 0) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }, [focusRequest]);

  const handleStopAndSend = async () => {
    const result = await stopRecording();
    if (result && handleSendAudio) {
      handleSendAudio(result.audioBlob, result.duration);
    }
  };

  const canSend =
    Boolean(user) &&
    (messageInput.trim().length > 0 || Boolean(attachmentFile));

  return (
    <div className="relative shrink-0 bg-white px-4 pb-4 pt-2 md:px-6">
      {attachmentPreview && (
        <div className="absolute bottom-full left-4 z-10 mb-1 rounded-2xl border border-[#F0F2F6] bg-white p-2 shadow-[0_12px_32px_rgba(16,16,17,0.1)] md:left-6">
          <div className="relative">
            <AppImage
              src={attachmentPreview}
              alt="Attachment"
              className="h-32 w-auto rounded-xl bg-[#F8F7FF] object-contain"
              loadingMode="eager"
            />
            <button
              type="button"
              onClick={clearAttachment}
              aria-label="Remove attachment"
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-[#F0F2F6] bg-white text-[#606266] shadow-sm outline-none transition-[transform,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:text-red-500"
            >
              <LuX aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      <div className="flex min-h-[3.25rem] items-end gap-1 rounded-[1.625rem] border border-[#F0F2F6] bg-white p-1.5 shadow-sm transition-colors duration-150 focus-within:border-[#8771FF]">
        {isRecording ? (
          <div className="flex h-10 flex-1 items-center justify-between pl-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-[#101011] tabular-nums">
                {formatTime(recordingTime)}
              </span>
              <span className="text-xs text-[#9A9CA2]">Recording...</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cancelRecording}
                className={`${TOOL_BUTTON_CLASS} text-[#9A9CA2] [@media(hover:hover)]:hover:bg-red-50 [@media(hover:hover)]:hover:text-red-500`}
                title="Cancel"
                aria-label="Cancel recording"
              >
                <LuTrash2
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem]"
                />
              </button>
              <button
                type="button"
                onClick={handleStopAndSend}
                className={`${TOOL_BUTTON_CLASS} bg-[#8771FF] text-white [@media(hover:hover)]:hover:bg-[#6d5ed6]`}
                title="Send"
                aria-label="Send voice note"
              >
                <LuCheck
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem]"
                />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`${TOOL_BUTTON_CLASS} ${
                  attachmentFile
                    ? "bg-[#F3F0FF] text-[#8771FF]"
                    : TOOL_BUTTON_IDLE_CLASS
                }`}
                title="Attach Image"
                aria-label="Attach image"
              >
                <LuImage
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem]"
                />
              </button>

              <button
                type="button"
                onClick={startRecording}
                className={`${TOOL_BUTTON_CLASS} ${TOOL_BUTTON_IDLE_CLASS}`}
                title="Record Voice Note"
                aria-label="Record voice note"
                disabled={!user}
              >
                <LuMic
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem]"
                />
              </button>

              {showCalendlyButton ? (
                <button
                  type="button"
                  onClick={onOpenCalendlyModal}
                  className={`${TOOL_BUTTON_CLASS} ${TOOL_BUTTON_IDLE_CLASS}`}
                  title="Send Calendly Link"
                  aria-label="Send Calendly link"
                  disabled={!user}
                >
                  <LuCalendarPlus
                    aria-hidden="true"
                    className="h-[1.125rem] w-[1.125rem]"
                  />
                </button>
              ) : null}
            </div>

            <textarea
              ref={textareaRef}
              aria-label="Message"
              className="max-h-[120px] min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[0.9375rem] leading-5 text-[#101011] outline-none placeholder:text-[#9A9CA2] focus:outline-none focus:ring-0"
              placeholder="Message"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              onPaste={(e) => {
                const imageItem = Array.from(e.clipboardData.items).find(
                  (item) =>
                    item.kind === "file" && item.type.startsWith("image/"),
                );
                if (!imageItem) return;
                const pastedImage = imageItem.getAsFile();
                if (!pastedImage) return;
                e.preventDefault();
                handleAttachmentPaste(pastedImage);
              }}
              disabled={!user}
              rows={1}
            />

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!canSend}
              aria-label="Send message"
              title="Send"
              className={`${TOOL_BUTTON_CLASS} bg-[#8771FF] text-white disabled:bg-[#F4F5F8] disabled:text-[#9A9CA2] disabled:opacity-100 [@media(hover:hover)]:enabled:hover:bg-[#6d5ed6]`}
            >
              <LuArrowUp
                aria-hidden="true"
                className="h-[1.125rem] w-[1.125rem]"
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
