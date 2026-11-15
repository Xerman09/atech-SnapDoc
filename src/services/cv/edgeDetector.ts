import { CropQuad, Point } from '../../types/scanner';
import { getDefaultCropQuad, orderQuadCorners } from './geometry';

/**
 * Detects approximate document corners from an RGBA buffer using
 * luminance Sobel edge energy and radial corner projection.
 * Falls back to a clean inset quad if no strong document boundary is found.
 */
export function detectDocumentQuad(
  rgba: Uint8Array,
  width: number,
  height: number
): CropQuad {
  if (width < 32 || height < 32) {
    return getDefaultCropQuad(width, height);
  }

  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
  }

  // Sobel gradient magnitude
  const mag = new Float32Array(width * height);
  let sumMag = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = gray[(y - 1) * width + (x - 1)];
      const tc = gray[(y - 1) * width + x];
      const tr = gray[(y - 1) * width + (x + 1)];
      const ml = gray[y * width + (x - 1)];
      const mr = gray[y * width + (x + 1)];
      const bl = gray[(y + 1) * width + (x - 1)];
      const bc = gray[(y + 1) * width + x];
      const br = gray[(y + 1) * width + (x + 1)];

      const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[y * width + x] = m;
      sumMag += m;
    }
  }

  const meanMag = sumMag / (width * height);
  const threshold = Math.max(45, meanMag * 2.2);

  // Find extreme strong-edge points in each quadrant
  const cx = width / 2;
  const cy = height / 2;

  let tlBest: Point | null = null;
  let trBest: Point | null = null;
  let brBest: Point | null = null;
  let blBest: Point | null = null;

  let tlScore = -1;
  let trScore = -1;
  let brScore = -1;
  let blScore = -1;

  const marginX = Math.floor(width * 0.03);
  const marginY = Math.floor(height * 0.03);

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      if (mag[y * width + x] < threshold) continue;

      const distCenter = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (x < cx && y < cy && distCenter > tlScore) {
        tlScore = distCenter;
        tlBest = { x, y };
      } else if (x >= cx && y < cy && distCenter > trScore) {
        trScore = distCenter;
        trBest = { x, y };
      } else if (x >= cx && y >= cy && distCenter > brScore) {
        brScore = distCenter;
        brBest = { x, y };
      } else if (x < cx && y >= cy && distCenter > blScore) {
        blScore = distCenter;
        blBest = { x, y };
      }
    }
  }

  if (!tlBest || !trBest || !brBest || !blBest) {
    return getDefaultCropQuad(width, height);
  }

  const quad = orderQuadCorners([tlBest, trBest, brBest, blBest]);
  const minW = width * 0.25;
  const minH = height * 0.25;
  const quadW = Math.max(
    quad.topRight.x - quad.topLeft.x,
    quad.bottomRight.x - quad.bottomLeft.x
  );
  const quadH = Math.max(
    quad.bottomLeft.y - quad.topLeft.y,
    quad.bottomRight.y - quad.topRight.y
  );

  if (quadW < minW || quadH < minH) {
    return getDefaultCropQuad(width, height);
  }

  return quad;
}
