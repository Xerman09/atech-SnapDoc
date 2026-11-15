import { z } from 'zod';

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_IMAGE_DIMENSION_PX = 10000;

export const ImportedImageSchema = z.object({
  uri: z.string().min(1, 'Image URI is required'),
  fileName: z.string().optional().nullable(),
  mimeType: z.string().optional().nullable(),
  fileSize: z
    .number()
    .int()
    .nonnegative()
    .max(MAX_IMAGE_FILE_BYTES, 'Image exceeds 20 MB limit')
    .optional()
    .nullable(),
  width: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_DIMENSION_PX, 'Image width exceeds 10,000 px limit')
    .optional()
    .nullable(),
  height: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_DIMENSION_PX, 'Image height exceeds 10,000 px limit')
    .optional()
    .nullable(),
});

export type ImportedImageInput = z.infer<typeof ImportedImageSchema>;

export function sanitizeFilename(rawName: string, fallbackExt = 'jpg'): string {
  const baseOnly = rawName.split(/[\\/]/).pop() ?? '';
  const cleaned = baseOnly
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+/, '');

  if (!cleaned) {
    return `scan_${Date.now()}.${fallbackExt}`;
  }
  return cleaned.slice(0, 80);
}

export function getExtensionFromUriOrName(uri: string, fileName?: string | null): string {
  const target = (fileName || uri).split('?')[0];
  const parts = target.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function validateImportedImage(
  input: ImportedImageInput
): { ok: true; extension: string } | { ok: false; reason: string } {
  const parsed = ImportedImageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? 'Invalid image input' };
  }

  const ext = getExtensionFromUriOrName(input.uri, input.fileName);
  const mime = input.mimeType?.toLowerCase() ?? '';

  const extAllowed = (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
  const mimeAllowed = mime
    ? (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
    : false;

  if (!extAllowed && !mimeAllowed) {
    return {
      ok: false,
      reason: 'Unsupported file type. Only JPG, PNG, and WebP images are allowed.',
    };
  }

  const normalizedExt = extAllowed
    ? ext
    : mime.includes('png')
      ? 'png'
      : mime.includes('webp')
        ? 'webp'
        : 'jpg';

  return { ok: true, extension: normalizedExt };
}
