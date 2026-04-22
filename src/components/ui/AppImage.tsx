"use client";

import type { ImgHTMLAttributes } from "react";
import { resolveAppImageSrc } from "@/lib/media/remoteImageUrl";

type AppImageLoading = "eager" | "lazy";

interface AppImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> {
  loadingMode?: AppImageLoading;
}

export function AppImage({
  loadingMode = "lazy",
  alt = "",
  src,
  fetchPriority,
  ...props
}: AppImageProps) {
  return (
    /* biome-ignore lint/performance/noImgElement: this wrapper must support blob URLs and proxied remote assets that are incompatible with next/image. */
    <img
      {...props}
      alt={alt}
      src={typeof src === "string" ? (resolveAppImageSrc(src) ?? src) : src}
      fetchPriority={
        fetchPriority ?? (loadingMode === "eager" ? "high" : "auto")
      }
      loading={loadingMode}
      decoding="async"
    />
  );
}
