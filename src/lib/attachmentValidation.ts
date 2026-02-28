export type AttachmentType = 'image' | 'audio' | 'video' | 'file';

interface AttachmentValidationRule {
  maxBytes: number;
  allowedMimeTypes: readonly string[];
}

interface AttachmentValidationError {
  error: string;
  status: number;
}

const MB = 1024 * 1024;

const ATTACHMENT_VALIDATION_RULES: Record<AttachmentType, AttachmentValidationRule> = {
  image: {
    maxBytes: 10 * MB,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  },
  audio: {
    maxBytes: 25 * MB,
    allowedMimeTypes: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav'],
  },
  video: {
    maxBytes: 50 * MB,
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  },
  file: {
    maxBytes: 25 * MB,
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
};

function isAttachmentType(value: string): value is AttachmentType {
  return value === 'image' || value === 'audio' || value === 'video' || value === 'file';
}

function isAllowedMimeType(
  normalizedMimeType: string,
  attachmentType: AttachmentType,
  allowedMimeTypes: readonly string[],
): boolean {
  if (allowedMimeTypes.includes(normalizedMimeType)) {
    return true;
  }

  // Browsers can emit audio recorder MIME variants like audio/x-m4a.
  if (attachmentType === 'audio' && normalizedMimeType.startsWith('audio/')) {
    return true;
  }

  return false;
}

export function parseAttachmentType(rawType: FormDataEntryValue | null): AttachmentType | null {
  if (typeof rawType !== 'string' || rawType.trim().length === 0) {
    return 'image';
  }

  const normalizedType = rawType.trim().toLowerCase();
  if (!isAttachmentType(normalizedType)) {
    return null;
  }

  return normalizedType;
}

export function validateAttachmentUpload(
  file: File,
  attachmentType: AttachmentType,
): AttachmentValidationError | null {
  const rule = ATTACHMENT_VALIDATION_RULES[attachmentType];
  const mimeType = file.type.trim().toLowerCase();
  const normalizedMimeType = mimeType.split(';', 1)[0]?.trim() ?? '';

  if (!mimeType) {
    return {
      error: 'File MIME type is required',
      status: 400,
    };
  }

  if (!isAllowedMimeType(normalizedMimeType, attachmentType, rule.allowedMimeTypes)) {
    return {
      error: 'Unsupported file type for attachment',
      status: 415,
    };
  }

  if (file.size <= 0) {
    return {
      error: 'File is empty',
      status: 400,
    };
  }

  if (file.size > rule.maxBytes) {
    return {
      error: 'Attachment exceeds the maximum allowed size',
      status: 413,
    };
  }

  return null;
}
