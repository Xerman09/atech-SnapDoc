import { Buffer } from 'buffer';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Platform } from 'react-native';
import { AdjustmentSettings, CropQuad, FilterPreset } from '../../types/scanner';
import { sanitizeFilename } from '../../utils/fileValidation';
import { getScansDirectory, saveScanImageToAppStorage } from '../storage/localFiles';
import { applyScanFilterToRgba } from '../filters/scanFilters';
import { detectDocumentQuad, shouldRotate90ForUprightText } from './edgeDetector';
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
 * Checks if a captured page's text lines appear sideways and rotates 90 degrees
 * upright when detected.
 */
export async function autoOrientImageIfNeeded(
  uri: string
): Promise<{ rotated: boolean; uri: string }> {
  try {
    const decoded = await decodeWorkingImage(uri, 320);
    if (shouldRotate90ForUprightText(decoded.data, decoded.width, decoded.height)) {
      const res = await rotateImage90(uri, 'right');
      return { rotated: true, uri: res.uri };
    }
    return { rotated: false, uri };
  } catch {
    return { rotated: false, uri };
  }
}

/**
 * Loads a downsampled working JPEG, runs Sobel edge detection, and returns
 * normalized 0..1 corner coordinates for the UI crop overlay.
 */
export async function autoDetectNormalizedQuad(uri: string): Promise<CropQuad> {
  try {
    const thumb = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 400 } }],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG, base64: true }
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

async function saveRgbaAsJpeg(
  rgba: Uint8Array,
  width: number,
  height: number,
  prefix = 'processed'
): Promise<{ uri: string; width: number; height: number }> {
  const encoded = jpeg.encode({ data: rgba, width, height }, 94);

  if (Platform.OS === 'web') {
    const base64Jpg = uint8ArrayToBase64(encoded.data);
    return {
      uri: `data:image/jpeg;base64,${base64Jpg}`,
      width,
      height,
    };
  }

  const outName = sanitizeFilename(
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`,
    'jpg'
  );
  const outFile = new File(getScansDirectory(), outName);
  outFile.create({ intermediates: true, overwrite: true });
  await outFile.write(new Uint8Array(encoded.data));

  return {
    uri: outFile.uri,
    width,
    height,
  };
}

async function decodeWorkingImage(
  sourceUri: string,
  maxWidth: number
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const working = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: maxWidth } }],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  if (!working.base64) {
    throw new Error('Failed to decode working image.');
  }
  const rawBytes = base64ToUint8Array(working.base64);
  const decoded = jpeg.decode(rawBytes, { useTArray: true });
  return { data: decoded.data, width: decoded.width, height: decoded.height };
}

function normalizedToPixelQuad(
  normalizedQuad: CropQuad,
  width: number,
  height: number
): CropQuad {
  return {
    topLeft: { x: normalizedQuad.topLeft.x * width, y: normalizedQuad.topLeft.y * height },
    topRight: { x: normalizedQuad.topRight.x * width, y: normalizedQuad.topRight.y * height },
    bottomRight: { x: normalizedQuad.bottomRight.x * width, y: normalizedQuad.bottomRight.y * height },
    bottomLeft: { x: normalizedQuad.bottomLeft.x * width, y: normalizedQuad.bottomLeft.y * height },
  };
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
  const decoded = await decodeWorkingImage(sourceUri, 1600);
  const pixelQuad = normalizedToPixelQuad(normalizedQuad, decoded.width, decoded.height);
  const targetDims = estimateTargetDimensions(pixelQuad, 1800);

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

  return saveRgbaAsJpeg(filtered, targetDims.width, targetDims.height, 'processed');
}

/**
 * Warps and filters a two-page book spread, then splits it down the center spine
 * into two separate left & right page JPEGs.
 */
export async function splitSpreadPage(
  sourceUri: string,
  normalizedQuad: CropQuad,
  filter: FilterPreset,
  adjustments: AdjustmentSettings
): Promise<[{ uri: string; width: number; height: number }, { uri: string; width: number; height: number }]> {
  const decoded = await decodeWorkingImage(sourceUri, 1600);
  const pixelQuad = normalizedToPixelQuad(normalizedQuad, decoded.width, decoded.height);
  const targetDims = estimateTargetDimensions(pixelQuad, 1800);

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

  const fullW = targetDims.width;
  const fullH = targetDims.height;
  const leftW = Math.max(1, Math.floor(fullW / 2));
  const rightW = Math.max(1, fullW - leftW);

  const leftRgba = new Uint8Array(leftW * fullH * 4);
  const rightRgba = new Uint8Array(rightW * fullH * 4);

  for (let y = 0; y < fullH; y++) {
    const srcRow = y * fullW * 4;
    leftRgba.set(filtered.subarray(srcRow, srcRow + leftW * 4), y * leftW * 4);
    rightRgba.set(
      filtered.subarray(srcRow + leftW * 4, srcRow + fullW * 4),
      y * rightW * 4
    );
  }

  const leftPage = await saveRgbaAsJpeg(leftRgba, leftW, fullH, 'spread_left');
  const rightPage = await saveRgbaAsJpeg(rightRgba, rightW, fullH, 'spread_right');
  return [leftPage, rightPage];
}

/**
 * Places Front and Back ID card captures onto a single clean white A4 canvas
 * (1240 x 1754 px) offline and saves it as a JPEG.
 */
export async function composeIdCardA4Page(
  frontUri: string,
  backUri: string
): Promise<{ uri: string; width: number; height: number }> {
  const a4W = 1240;
  const a4H = 1754;
  const canvas = new Uint8Array(a4W * a4H * 4);
  canvas.fill(255);

  const [front, back] = await Promise.all([
    decodeWorkingImage(frontUri, 920),
    decodeWorkingImage(backUri, 920),
  ]);

  const drawCard = (
    card: { data: Uint8Array; width: number; height: number },
    slotTopY: number,
    slotH: number
  ) => {
    const maxW = Math.round(a4W * 0.78);
    const maxH = Math.round(slotH * 0.82);
    const scale = Math.min(maxW / card.width, maxH / card.height);
    const dstW = Math.max(1, Math.round(card.width * scale));
    const dstH = Math.max(1, Math.round(card.height * scale));
    const startX = Math.round((a4W - dstW) / 2);
    const startY = Math.round(slotTopY + (slotH - dstH) / 2);

    // Subtle 2px slate border around card
    for (let y = Math.max(0, startY - 2); y < Math.min(a4H, startY + dstH + 2); y++) {
      for (let x = Math.max(0, startX - 2); x < Math.min(a4W, startX + dstW + 2); x++) {
        const idx = (y * a4W + x) * 4;
        canvas[idx] = 203;
        canvas[idx + 1] = 213;
        canvas[idx + 2] = 225;
        canvas[idx + 3] = 255;
      }
    }

    for (let y = 0; y < dstH; y++) {
      const sy = Math.min(card.height - 1, Math.floor((y / dstH) * card.height));
      for (let x = 0; x < dstW; x++) {
        const sx = Math.min(card.width - 1, Math.floor((x / dstW) * card.width));
        const sIdx = (sy * card.width + sx) * 4;
        const dIdx = ((startY + y) * a4W + (startX + x)) * 4;
        canvas[dIdx] = card.data[sIdx];
        canvas[dIdx + 1] = card.data[sIdx + 1];
        canvas[dIdx + 2] = card.data[sIdx + 2];
        canvas[dIdx + 3] = 255;
      }
    }
  };

  drawCard(front, 80, Math.floor((a4H - 160) / 2));
  drawCard(back, 80 + Math.floor((a4H - 160) / 2), Math.floor((a4H - 160) / 2));

  return saveRgbaAsJpeg(canvas, a4W, a4H, 'idcard_a4');
}
