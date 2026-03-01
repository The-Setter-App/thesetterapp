type OptimizeImageOptions = {
  maxDimension: number;
  targetBytes: number;
  minBytesForOptimization: number;
  minReductionRatio: number;
  qualitySteps: number[];
};

export type OptimizeImageResult = {
  file: File;
  optimized: boolean;
  originalSize: number;
  optimizedSize: number;
};

const DEFAULT_OPTIONS: OptimizeImageOptions = {
  maxDimension: 1600,
  targetBytes: 1_100_000,
  minBytesForOptimization: 600_000,
  minReductionRatio: 0.92,
  qualitySteps: [0.82, 0.74, 0.66, 0.58, 0.5],
};

type CandidateBlob = {
  blob: Blob;
  mimeType: string;
};

function buildCandidateMimeTypes(inputMimeType: string): string[] {
  if (inputMimeType === 'image/jpeg') return ['image/jpeg', 'image/webp'];
  if (inputMimeType === 'image/webp') return ['image/webp', 'image/jpeg'];
  if (inputMimeType === 'image/png') return ['image/webp', 'image/jpeg', 'image/png'];
  return ['image/jpeg', 'image/webp'];
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/png') return 'png';
  return 'jpg';
}

function buildCompressedFileName(originalName: string, mimeType: string): string {
  const dotIndex = originalName.lastIndexOf('.');
  const stem = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = extensionForMimeType(mimeType);
  return `${stem}.${extension}`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Failed to decode image for optimization'));
    };

    image.src = imageUrl;
  });
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function pickBestCandidate(candidates: CandidateBlob[], targetBytes: number): CandidateBlob | null {
  if (!candidates.length) return null;
  const underTarget = candidates
    .filter((candidate) => candidate.blob.size <= targetBytes)
    .sort((a, b) => a.blob.size - b.blob.size);
  if (underTarget.length) return underTarget[0];
  return candidates.sort((a, b) => a.blob.size - b.blob.size)[0];
}

export async function optimizeImageForUpload(
  file: File,
  options?: Partial<OptimizeImageOptions>,
): Promise<OptimizeImageResult> {
  const merged: OptimizeImageOptions = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  if (!file.type.startsWith('image/')) {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }

  // Preserve animation for GIFs (canvas conversion would flatten to a single frame).
  if (file.type === 'image/gif') {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }

  if (file.size < merged.minBytesForOptimization) {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }

  const image = await loadImageElement(file);
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = largestSide > merged.maxDimension ? merged.maxDimension / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = createCanvas(targetWidth, targetHeight);
  const context = canvas.getContext('2d');
  if (!context) {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const mimeTypes = buildCandidateMimeTypes(file.type);
  const candidates: CandidateBlob[] = [];

  for (const mimeType of mimeTypes) {
    if (mimeType === 'image/png') {
      const pngBlob = await canvasToBlob(canvas, mimeType);
      if (pngBlob) candidates.push({ blob: pngBlob, mimeType });
      continue;
    }

    for (const quality of merged.qualitySteps) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (!blob) continue;
      candidates.push({ blob, mimeType });
      if (blob.size <= merged.targetBytes) break;
    }
  }

  const best = pickBestCandidate(candidates, merged.targetBytes);
  if (!best) {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }

  if (best.blob.size >= originalSize * merged.minReductionRatio) {
    return { file, optimized: false, originalSize, optimizedSize: originalSize };
  }

  const optimizedFile = new File([best.blob], buildCompressedFileName(file.name, best.mimeType), {
    type: best.mimeType,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    optimized: true,
    originalSize,
    optimizedSize: optimizedFile.size,
  };
}
