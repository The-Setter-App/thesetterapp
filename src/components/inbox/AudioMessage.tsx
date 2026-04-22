"use client";

import { useEffect, useRef, useState } from "react";
import { resolveAppMediaSrc } from "@/lib/media/remoteMediaUrl";

const WAVEFORM_BARS = [
  { id: "wave-1", height: 2 },
  { id: "wave-2", height: 8 },
  { id: "wave-3", height: 14 },
  { id: "wave-4", height: 4 },
  { id: "wave-5", height: 16 },
  { id: "wave-6", height: 14 },
  { id: "wave-7", height: 10 },
  { id: "wave-8", height: 10 },
  { id: "wave-9", height: 10 },
  { id: "wave-10", height: 14 },
  { id: "wave-11", height: 10 },
  { id: "wave-12", height: 16 },
  { id: "wave-13", height: 10 },
  { id: "wave-14", height: 4 },
  { id: "wave-15", height: 2 },
] as const;

function formatDurationDisplay(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

interface AudioMessageProps {
  messageId: string;
  src: string;
  duration?: string; // "0:05"
  isOwn: boolean;
  onDurationResolved?: (messageId: string, duration: string) => void;
}

export default function AudioMessage({
  messageId,
  src,
  duration,
  isOwn,
  onDurationResolved,
}: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastReportedDurationRef = useRef<string>("");
  const durationRef = useRef<string | undefined>(duration);
  const onDurationResolvedRef =
    useRef<AudioMessageProps["onDurationResolved"]>(onDurationResolved);
  const playRequestIdRef = useRef(0);
  const resolvedSrc = resolveAppMediaSrc(src) || src;

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !resolvedSrc) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    const requestId = ++playRequestIdRef.current;
    try {
      await audio.play();
      if (requestId !== playRequestIdRef.current) return;
    } catch (error) {
      if (requestId !== playRequestIdRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Failed to play audio message:", error);
    }
  };

  const parseDuration = (value?: string): number | null => {
    if (!value) return null;
    const [minutes, seconds] = value.split(":");
    const m = Number(minutes);
    const s = Number(seconds);
    if (Number.isNaN(m) || Number.isNaN(s)) return null;
    return m * 60 + s;
  };

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    onDurationResolvedRef.current = onDurationResolved;
  }, [onDurationResolved]);

  useEffect(() => {
    playRequestIdRef.current += 1;
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const syncDuration = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (nextDuration > 0) {
        setLoadedDuration(nextDuration);
        const resolvedDuration = formatDurationDisplay(nextDuration);
        if (
          onDurationResolvedRef.current &&
          resolvedDuration !== lastReportedDurationRef.current &&
          resolvedDuration !== durationRef.current
        ) {
          lastReportedDurationRef.current = resolvedDuration;
          onDurationResolvedRef.current(messageId, resolvedDuration);
        }
      }
    };
    const onLoadedMetadata = () => syncDuration();
    const onDurationChange = () => syncDuration();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    setCurrentTime(audio.currentTime || 0);
    setIsPlaying(!audio.paused);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [messageId]);

  const providedDurationSeconds = parseDuration(duration);
  const hasLoadedDuration =
    Number.isFinite(loadedDuration) && loadedDuration > 0;
  const hasProvidedDuration =
    providedDurationSeconds !== null && providedDurationSeconds > 0;
  const displayDuration = hasLoadedDuration
    ? formatDurationDisplay(loadedDuration)
    : hasProvidedDuration
      ? duration || formatDurationDisplay(providedDurationSeconds || 0)
      : "0:00";

  return (
    <div
      className={`relative isolate flex items-center px-2 py-2 gap-3 w-[226px] h-[48px] rounded-[24px] shadow-[0px_4px_4px_rgba(0,0,0,0.1)] ${
        isOwn ? "bg-[#8771FF]" : "bg-white border border-[#F0F2F6]"
      }`}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: this hidden audio element powers inline voice-note playback rather than presenting standalone media controls. */}
      <audio
        ref={audioRef}
        src={resolvedSrc}
        preload="metadata"
        className="hidden"
      />

      {/* Play Button: 32x32, z-index: 2 */}
      <button
        type="button"
        onClick={togglePlay}
        className={`relative z-[2] flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all ${
          isOwn
            ? "bg-white text-[#8771FF] hover:scale-105"
            : "bg-[#8771FF] text-white hover:scale-105"
        }`}
      >
        {isPlaying ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform: 86px width, gap 3px, z-index: 3 */}
      <div className="relative z-[3] flex items-center gap-[3px] h-8 w-[86px]">
        {WAVEFORM_BARS.map((bar) => (
          <div
            key={bar.id}
            className={`w-[3px] rounded-full ${isOwn ? "bg-white" : "bg-[#8771FF]"}`}
            style={{ height: `${bar.height}px`, opacity: 0.7 }}
          />
        ))}
      </div>

      {/* Timestamp: z-index: 4 */}
      <div
        className={`relative z-[4] font-medium text-[12px] leading-[16px] whitespace-nowrap ${isOwn ? "text-white" : "text-[#606266]"}`}
        style={{ opacity: 0.8 }}
      >
        {isPlaying ? formatDurationDisplay(currentTime) : displayDuration}
      </div>

      {/* Volume Icon: z-index: 5 */}
      <div
        className={`relative z-[5] flex-shrink-0 ${isOwn ? "text-white" : "text-[#606266]"}`}
        style={{ opacity: 0.7 }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      </div>
    </div>
  );
}
