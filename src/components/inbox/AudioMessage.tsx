"use client";

import { useState, useRef, useEffect } from 'react';

interface AudioMessageProps {
  src: string;
  duration?: string; // "0:05"
  isOwn: boolean;
}

export default function AudioMessage({ src, duration, isOwn }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Waveform heights from design spec
  const waveformHeights = [2, 8, 14, 4, 16, 14, 10, 10, 10, 14, 10, 16, 10, 4, 2];

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setLoadedDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Use provided duration string first, fallback to loaded duration, then 0:00
  const displayDuration = duration || formatTime(loadedDuration);

  return (
    <div 
      className={`relative isolate flex items-center px-2 py-2 gap-3 w-[226px] h-[48px] rounded-[24px] shadow-[0px_4px_4px_rgba(0,0,0,0.1)] ${
        isOwn ? 'bg-[#8771FF]' : 'bg-white border border-gray-200'
      }`}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      
      {/* Play Button: 32x32, z-index: 2 */}
      <button 
        onClick={togglePlay}
        className={`relative z-[2] flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all ${
             isOwn ? 'bg-white text-[#8771FF] hover:scale-105' : 'bg-[#8771FF] text-white hover:scale-105'
        }`}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform: 86px width, gap 3px, z-index: 3 */}
      <div className="relative z-[3] flex items-center gap-[3px] h-8 w-[86px]">
         {waveformHeights.map((h, i) => (
           <div 
             key={i} 
             className={`w-[3px] rounded-full ${isOwn ? 'bg-white' : 'bg-[#8771FF]'}`} 
             style={{ height: `${h}px`, opacity: 0.7 }} 
           />
         ))}
      </div>

      {/* Timestamp: z-index: 4 */}
      <div className={`relative z-[4] font-medium text-[12px] leading-[16px] whitespace-nowrap ${isOwn ? 'text-white' : 'text-gray-600'}`} style={{ opacity: 0.8 }}>
        {isPlaying ? formatTime(currentTime) : displayDuration}
      </div>

      {/* Volume Icon: z-index: 5 */}
      <div className={`relative z-[5] flex-shrink-0 ${isOwn ? 'text-white' : 'text-gray-500'}`} style={{ opacity: 0.7 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
           <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      </div>
    </div>
  );
}