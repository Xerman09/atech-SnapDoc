import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { z } from 'zod';
import { BUSINESS_INFO } from '../../constants/legal';

/**
 * HTTPS-only update manifest URL (trimmed minimal JSON response).
 * Replace with your hosted GitHub Releases or HTTPS manifest endpoint when publishing.
 */
export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/Xerman09/atech-SnapDoc/main/update-manifest.json';

const UpdateManifestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid semantic version'),
  apkUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'Update URL must use HTTPS'),
  sha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Invalid SHA-256 checksum'),
  notes: z.string().max(500),
  releasedAt: z.number().int().positive(),
});

export type UpdateManifest = z.infer<typeof UpdateManifestSchema>;

export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Checks for an app update when online; silently returns null when offline
 * so core offline scanning is never interrupted.
 */
export async function checkForInAppUpdate(
  manifestUrl: string = UPDATE_MANIFEST_URL
): Promise<UpdateManifest | null> {
  if (!manifestUrl.startsWith('https://')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) return null;
    const raw = await response.json();
    const parsed = UpdateManifestSchema.safeParse(raw);
    if (!parsed.success) return null;

    if (compareSemver(parsed.data.version, BUSINESS_INFO.appVersion) > 0) {
      return parsed.data;
    }
    return null;
  } catch {
    // Offline or unreachable — fail silently without blocking offline usage
    return null;
  }
}

/**
 * Downloads the signed APK into app cache, verifies its SHA-256 checksum,
 * and launches Android's native in-app package installer (no external browser).
 */
export async function downloadAndInstallApkUpdate(
  manifest: UpdateManifest
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('In-app APK installation is supported on Android devices.');
  }

  const targetFile = new File(Paths.cache, `snapdoc_update_${manifest.version}.apk`);
  if (targetFile.exists) {
    targetFile.delete();
  }

  const downloaded = await File.downloadFileAsync(manifest.apkUrl, targetFile, {
    idempotent: true,
  });

  // Verify SHA-256 integrity before launching installer
  const bytes = await downloaded.bytes();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Array.from(bytes, (b) => String.fromCharCode(b)).join('')
  );

  // Note: If sha256 verification fails on binary encoding, verify hex length & match
  if (digest.toLowerCase() !== manifest.sha256.toLowerCase()) {
    downloaded.delete();
    throw new Error('Update package failed SHA-256 integrity verification.');
  }

  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: downloaded.contentUri,
    flags: 1 | 0x10000000, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
    type: 'application/vnd.android.package-archive',
  });
}
