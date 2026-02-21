import { MAX_PROFILE_IMAGE_BYTES } from "@/lib/profileValidation";

const DEFAULT_PROFILE_IMAGE_MAX_DIMENSION = 1024;
const JPEG_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5];
const RESIZE_REDUCTION_FACTOR = 0.85;
const MIN_RESIZE_DIMENSION = 128;

function estimateDataUrlBytes(dataUrl: string): number {
  const [, payload = ""] = dataUrl.split(",", 2);
  const cleaned = payload.replace(/=+$/, "");
  return Math.floor((cleaned.length * 3) / 4);
}

function getConstrainedDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image"));
    image.src = dataUrl;
  });
}

function renderToCanvas(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to initialize image canvas");
  }
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function findBestCompressedDataUrl(
  canvas: HTMLCanvasElement,
  originalMimeType: string,
  maxBytes: number
): string {
  const mimeCandidates = originalMimeType === "image/png" ? ["image/png", "image/jpeg"] : [originalMimeType, "image/jpeg"];
  let bestCandidate = "";

  for (const mimeType of mimeCandidates) {
    if (mimeType === "image/png") {
      const pngDataUrl = canvas.toDataURL("image/png");
      if (!bestCandidate || estimateDataUrlBytes(pngDataUrl) < estimateDataUrlBytes(bestCandidate)) {
        bestCandidate = pngDataUrl;
      }
      if (estimateDataUrlBytes(pngDataUrl) <= maxBytes) {
        return pngDataUrl;
      }
      continue;
    }

    for (const quality of JPEG_QUALITY_STEPS) {
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      if (!bestCandidate || estimateDataUrlBytes(compressedDataUrl) < estimateDataUrlBytes(bestCandidate)) {
        bestCandidate = compressedDataUrl;
      }
      if (estimateDataUrlBytes(compressedDataUrl) <= maxBytes) {
        return compressedDataUrl;
      }
    }
  }

  return bestCandidate;
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function fileToOptimizedProfileDataUrl(file: File): Promise<string> {
  const sourceDataUrl = await fileToDataUrl(file);
  if (!sourceDataUrl) {
    throw new Error("Failed to read image data");
  }

  // Fast path: if the encoded payload already fits, skip decode/recompress work.
  if (estimateDataUrlBytes(sourceDataUrl) <= MAX_PROFILE_IMAGE_BYTES) {
    return sourceDataUrl;
  }

  const image = await loadImageFromDataUrl(sourceDataUrl);
  let constrained = getConstrainedDimensions(image.naturalWidth, image.naturalHeight, DEFAULT_PROFILE_IMAGE_MAX_DIMENSION);
  let bestDataUrl = sourceDataUrl;

  while (true) {
    const canvas = renderToCanvas(image, constrained.width, constrained.height);
    const compressedDataUrl = findBestCompressedDataUrl(canvas, file.type, MAX_PROFILE_IMAGE_BYTES);
    if (!compressedDataUrl) {
      break;
    }

    bestDataUrl = compressedDataUrl;
    if (estimateDataUrlBytes(compressedDataUrl) <= MAX_PROFILE_IMAGE_BYTES) {
      return compressedDataUrl;
    }

    if (constrained.width <= MIN_RESIZE_DIMENSION && constrained.height <= MIN_RESIZE_DIMENSION) {
      break;
    }

    constrained = {
      width: Math.max(MIN_RESIZE_DIMENSION, Math.round(constrained.width * RESIZE_REDUCTION_FACTOR)),
      height: Math.max(MIN_RESIZE_DIMENSION, Math.round(constrained.height * RESIZE_REDUCTION_FACTOR)),
    };
  }

  return bestDataUrl;
}
