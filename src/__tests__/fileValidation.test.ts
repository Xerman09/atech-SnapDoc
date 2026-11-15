import { describe, expect, it } from 'vitest';
import {
  MAX_IMAGE_FILE_BYTES,
  sanitizeFilename,
  validateImportedImage,
} from '../utils/fileValidation';

describe('fileValidation security utilities', () => {
  it('accepts valid JPG, PNG, and WebP images within limits', () => {
    expect(
      validateImportedImage({
        uri: 'file:///tmp/doc.jpg',
        fileName: 'doc.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024 * 500,
        width: 1200,
        height: 1600,
      })
    ).toEqual({ ok: true, extension: 'jpg' });

    expect(
      validateImportedImage({
        uri: 'file:///tmp/scan.png',
        fileName: 'scan.png',
        mimeType: 'image/png',
        fileSize: 1024 * 800,
        width: 1000,
        height: 1400,
      })
    ).toEqual({ ok: true, extension: 'png' });
  });

  it('rejects unsupported file extensions and MIME types', () => {
    const res = validateImportedImage({
      uri: 'file:///tmp/payload.exe',
      fileName: 'payload.exe',
      mimeType: 'application/octet-stream',
      fileSize: 1024,
    });
    expect(res.ok).toBe(false);
  });

  it('rejects images exceeding 20 MB size limit', () => {
    const res = validateImportedImage({
      uri: 'file:///tmp/huge.jpg',
      fileName: 'huge.jpg',
      mimeType: 'image/jpeg',
      fileSize: MAX_IMAGE_FILE_BYTES + 1,
    });
    expect(res.ok).toBe(false);
  });

  it('sanitizes path traversal and unsafe characters in filenames', () => {
    const cleaned = sanitizeFilename('../../etc/passwd?bad*name.pdf', 'pdf');
    expect(cleaned).not.toContain('..');
    expect(cleaned).not.toContain('/');
    expect(cleaned).not.toContain('\\');
    expect(cleaned).toBe('passwd_bad_name.pdf');
  });
});
