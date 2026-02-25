'use client';

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

export function resolveAudioDurationFromUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const audio = new Audio();

    const cleanup = () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
    };

    const onLoadedMetadata = () => {
      const duration = formatDuration(audio.duration);
      cleanup();
      resolve(duration === "0:00" ? null : duration);
    };

    const onError = () => {
      cleanup();
      resolve(null);
    };

    audio.preload = "metadata";
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);
    audio.src = url;
    audio.load();
  });
}
