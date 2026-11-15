import { CropQuad, Point } from '../../types/scanner';
import { getDefaultCropQuad, orderQuadCorners } from './geometry';

/**
 * Detects approximate document corners from an RGBA buffer using
 * 3x3 Gaussian smoothing, multi-channel Sobel edge energy, and
 * quadrant-based strong-edge corner localization.
 */
export function detectDocumentQuad(
  rgba: Uint8Array,
  width: number,
  height: number
): CropQuad {
  if (width < 40 || height < 40) {
    return getDefaultCropQuad(width, height);
  }

  const total = width * height;
  const luma = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    luma[i] = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
  }

  // 3x3 Gaussian blur to suppress desk/paper texture noise
  const smooth = new Float32Array(total);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      smooth[i] =
        (luma[i - width - 1] +
          2 * luma[i - width] +
          luma[i - width + 1] +
          2 * luma[i - 1] +
          4 * luma[i] +
          2 * luma[i + 1] +
          luma[i + width - 1] +
          2 * luma[i + width] +
          luma[i + width + 1]) /
        16;
    }
  }

  // Sobel gradient magnitude
  const mag = new Float32Array(total);
  let sumMag = 0;
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      const gx =
        -smooth[i - width - 1] +
        smooth[i - width + 1] -
        2 * smooth[i - 1] +
        2 * smooth[i + 1] -
        smooth[i + width - 1] +
        smooth[i + width + 1];
      const gy =
        -smooth[i - width - 1] -
        2 * smooth[i - width] -
        smooth[i - width + 1] +
        smooth[i + width - 1] +
        2 * smooth[i + width] +
        smooth[i + width + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[i] = m;
      sumMag += m;
    }
  }

  const meanMag = sumMag / total;
  const threshold = Math.max(38, meanMag * 2.1);

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

  // Ignore outermost 4% border to avoid frame-edge artifacts
  const marginX = Math.floor(width * 0.04);
  const marginY = Math.floor(height * 0.04);

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const m = mag[y * width + x];
      if (m < threshold) continue;

      // Weight edge strength with distance from center so strong outer document corners win
      const distCenter = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const score = distCenter * (1 + Math.min(2, m / (threshold * 2)));

      if (x < cx && y < cy && score > tlScore) {
        tlScore = score;
        tlBest = { x, y };
      } else if (x >= cx && y < cy && score > trScore) {
        trScore = score;
        trBest = { x, y };
      } else if (x >= cx && y >= cy && score > brScore) {
        brScore = score;
        brBest = { x, y };
      } else if (x < cx && y >= cy && score > blScore) {
        blScore = score;
        blBest = { x, y };
      }
    }
  }

  if (!tlBest || !trBest || !brBest || !blBest) {
    return getDefaultCropQuad(width, height, 0.08);
  }

  const quad = orderQuadCorners([tlBest, trBest, brBest, blBest]);
  const quadW = Math.max(
    quad.topRight.x - quad.topLeft.x,
    quad.bottomRight.x - quad.bottomLeft.x
  );
  const quadH = Math.max(
    quad.bottomLeft.y - quad.topLeft.y,
    quad.bottomRight.y - quad.topRight.y
  );

  // Reject degenerate tiny quads
  if (quadW < width * 0.25 || quadH < height * 0.25) {
    return getDefaultCropQuad(width, height, 0.08);
  }

  return quad;
}
