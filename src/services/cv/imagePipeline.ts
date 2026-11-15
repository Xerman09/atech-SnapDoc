import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Platform } from 'react-native';
import { AdjustmentSettings, CropQuad, FilterPreset } from '../../types/scanner';
import { sanitizeFilename } from '../../utils/fileValidation';
import { getScansDirectory, saveScanImageToAppStorage } from '../storage/localFiles';
import { applyScanFilterToRgba } from '../filters/scanFilters';
import { detectDocumentQuad } from './edgeDetector';
import {
  estimateTargetDimensions,
  getDefaultCropQuad,
  warpPerspectiveRgba,
} from './geometry';

const g = globalThis as unknown as { Buffer?: typeof Buffer };
if (typeof g.Buffer === 'undefined') {
  g.Buffer = Buffer;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const clean = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const binary = globalThis.atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

/**
 * Rotates an image by 90 degrees left (-90) or right (+90) offline.
 */
export async function rotateImage90(
  uri: string,
  direction: 'left' | 'right'
): Promise<{ uri: string; width: number; height: number }> {
  const degrees = direction === 'right' ? 90 : -90;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ rotate: degrees }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
  );
  const savedUri = saveScanImageToAppStorage(result.uri, `rot_${Date.now()}.jpg`, 'jpg');
  return { uri: savedUri, width: result.width, height: result.height };
}

/**
 * Loads a downsampled working JPEG, runs Sobel edge detection, and returns
 * normalized 0..1 corner coordinates for the UI crop overlay.
 */
export async function autoDetectNormalizedQuad(uri: string): Promise<CropQuad> {
  try {
    const thumb = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 320 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!thumb.base64) {
      return getDefaultCropQuad(1, 1, 0.08);
    }

    const rawBytes = base64ToUint8Array(thumb.base64);
    const decoded = jpeg.decode(rawBytes, { useTArray: true });
    const quad = detectDocumentQuad(decoded.data, decoded.width, decoded.height);

    return {
      topLeft: { x: quad.topLeft.x / decoded.width, y: quad.topLeft.y / decoded.height },
      topRight: { x: quad.topRight.x / decoded.width, y: quad.topRight.y / decoded.height },
      bottomRight: { x: quad.bottomRight.x / decoded.width, y: quad.bottomRight.y / decoded.height },
      bottomLeft: { x: quad.bottomLeft.x / decoded.width, y: quad.bottomLeft.y / decoded.height },
    };
  } catch {
    return getDefaultCropQuad(1, 1, 0.08);
  }
}

/**
 * Applies 4-point perspective warp + scan filter + adjustments offline,
 * returning the newly saved processed image URI and dimensions.
 */
export async function processScanPage(
  sourceUri: string,
  normalizedQuad: CropQuad,
  filter: FilterPreset,
  adjustments: AdjustmentSettings
): Promise<{ uri: string; width: number; height: number }> {
  // Normalize to high-detail working resolution (max 1600px wide) for crisp text output
  const working = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!working.base64) {
    throw new Error('Failed to decode working image.');
  }

  const rawBytes = base64ToUint8Array(working.base64);
  const decoded = jpeg.decode(rawBytes, { useTArray: true });

  const pixelQuad: CropQuad = {
    topLeft: {
      x: normalizedQuad.topLeft.x * decoded.width,
      y: normalizedQuad.topLeft.y * decoded.height,
    },
    topRight: {
      x: normalizedQuad.topRight.x * decoded.width,
      y: normalizedQuad.topRight.y * decoded.height,
    },
    bottomRight: {
      x: normalizedQuad.bottomRight.x * decoded.width,
      y: normalizedQuad.bottomRight.y * decoded.height,
    },
    bottomLeft: {
      x: normalizedQuad.bottomLeft.x * decoded.width,
      y: normalizedQuad.bottomLeft.y * decoded.height,
    },
  };

  const targetDims = estimateTargetDimensions(pixelQuad, 1600);
  const warped = warpPerspectiveRgba(
    decoded.data,
    decoded.width,
    decoded.height,
    pixelQuad,
    targetDims.width,
    targetDims.height
  );

  const filtered = applyScanFilterToRgba(
    warped,
    targetDims.width,
    targetDims.height,
    filter,
    adjustments
  );

  const encoded = jpeg.encode(
    {
      data: filtered,
      width: targetDims.width,
      height: targetDims.height,
    },
    94
  );

  if (Platform.OS === 'web') {
    const base64Jpg = uint8ArrayToBase64(encoded.data);
    return {
      uri: `data:image/jpeg;base64,${base64Jpg}`,
      width: targetDims.width,
      height: targetDims.height,
    };
  }

  const outName = sanitizeFilename(
    `processed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`,
    'jpg'
  );
  const outFile = new File(getScansDirectory(), outName);
  outFile.create({ intermediates: true, overwrite: true });
  await outFile.write(new Uint8Array(encoded.data));

  return {
    uri: outFile.uri,
    width: targetDims.width,
    height: targetDims.height,
  };
}
