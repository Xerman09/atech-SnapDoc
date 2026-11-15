import { Directory, File, Paths } from 'expo-file-system';
import { sanitizeFilename } from '../../utils/fileValidation';

export function getScansDirectory(): Directory {
  const dir = new Directory(Paths.document, 'scans');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Copies a validated image URI into app-private document storage with a sanitized filename.
 */
export function saveScanImageToAppStorage(
  sourceUri: string,
  preferredName?: string | null,
  extension = 'jpg'
): string {
  const scansDir = getScansDirectory();
  const baseName = sanitizeFilename(
    preferredName ?? `scan_${Date.now()}.${extension}`,
    extension
  );
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${baseName}`;
  const targetFile = new File(scansDir, uniqueName);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(targetFile);
  return targetFile.uri;
}

/**
 * Deletes a single local scan file if it exists inside app storage.
 */
export function deleteLocalScanFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Permanently erases all locally stored scan files.
 */
export function deleteAllScanFiles(): void {
  try {
    const dir = new Directory(Paths.document, 'scans');
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Best-effort cleanup
  }
}
