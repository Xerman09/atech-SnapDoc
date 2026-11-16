import { CropQuad, Point } from '../../types/scanner';

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Orders 4 arbitrary points into topLeft, topRight, bottomRight, bottomLeft.
 */
export function orderQuadCorners(points: [Point, Point, Point, Point]): CropQuad {
  const sortedBySum = [...points].sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = sortedBySum[0];
  const bottomRight = sortedBySum[3];

  const remaining = [sortedBySum[1], sortedBySum[2]].sort(
    (a, b) => a.y - a.x - (b.y - b.x)
  );
  const topRight = remaining[0];
  const bottomLeft = remaining[1];

  return { topLeft, topRight, bottomRight, bottomLeft };
}

export function getDefaultCropQuad(
  width: number,
  height: number,
  insetRatio = 0.08
): CropQuad {
  const dx = width * insetRatio;
  const dy = height * insetRatio;
  return {
    topLeft: { x: dx, y: dy },
    topRight: { x: width - dx, y: dy },
    bottomRight: { x: width - dx, y: height - dy },
    bottomLeft: { x: dx, y: height - dy },
  };
}

export function estimateTargetDimensions(
  quad: CropQuad,
  maxDimension = 1600
): { width: number; height: number } {
  const topW = distance(quad.topLeft, quad.topRight);
  const bottomW = distance(quad.bottomLeft, quad.bottomRight);
  const leftH = distance(quad.topLeft, quad.bottomLeft);
  const rightH = distance(quad.topRight, quad.bottomRight);

  let width = Math.max(1, Math.round(Math.max(topW, bottomW)));
  let height = Math.max(1, Math.round(Math.max(leftH, rightH)));

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  return { width, height };
}

/**
 * Computes a 3x3 projective homography matrix H (9 elements, row-major)
 * mapping destination rectangle points (u, v) -> source image points (x, y).
 */
export function computeInverseHomography(
  quad: CropQuad,
  dstWidth: number,
  dstHeight: number
): number[] {
  const dst: Point[] = [
    { x: 0, y: 0 },
    { x: dstWidth - 1, y: 0 },
    { x: dstWidth - 1, y: dstHeight - 1 },
    { x: 0, y: dstHeight - 1 },
  ];
  const src: Point[] = [
    quad.topLeft,
    quad.topRight,
    quad.bottomRight,
    quad.bottomLeft,
  ];

  // Build 8x9 augmented matrix for Gaussian elimination
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const u = dst[i].x;
    const v = dst[i].y;
    const x = src[i].x;
    const y = src[i].y;
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }

  for (let col = 0; col < 8; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < 8; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivotRow][col])) {
        pivotRow = r;
      }
    }
    [A[col], A[pivotRow]] = [A[pivotRow], A[col]];

    const pivot = A[col][col];
    if (Math.abs(pivot) < 1e-10) {
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    for (let j = col; j < 9; j++) {
      A[col][j] /= pivot;
    }

    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const factor = A[r][col];
      for (let j = col; j < 9; j++) {
        A[r][j] -= factor * A[col][j];
      }
    }
  }

  return [
    A[0][8], A[1][8], A[2][8],
    A[3][8], A[4][8], A[5][8],
    A[6][8], A[7][8], 1,
  ];
}

/**
 * Performs inverse bilinear perspective warp from RGBA source buffer into destination buffer.
 */
export function warpPerspectiveRgba(
  src: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  quad: CropQuad,
  dstWidth: number,
  dstHeight: number,
  decurl = false
): Uint8Array {
  const H = computeInverseHomography(quad, dstWidth, dstHeight);
  const dst = new Uint8Array(dstWidth * dstHeight * 4);
  const maxU = Math.max(1, dstWidth - 1);
  const maxV = Math.max(1, dstHeight - 1);

  for (let v = 0; v < dstHeight; v++) {
    const nv = v / maxV;
    const edgeWeight = 1 - Math.abs(nv - 0.5) * 1.4;
    for (let u = 0; u < dstWidth; u++) {
      let sampleV = v;
      if (decurl && edgeWeight > 0) {
        const nu = u / maxU;
        // Smooth sinusoidal vertical arch compensation for curved notebook/book pages
        const arch = Math.sin(Math.PI * nu) * edgeWeight;
        sampleV = Math.max(0, Math.min(maxV, v - arch * dstHeight * 0.035));
      }
      const denom = H[6] * u + H[7] * sampleV + H[8];
      const sx = (H[0] * u + H[1] * sampleV + H[2]) / denom;
      const sy = (H[3] * u + H[4] * sampleV + H[5]) / denom;

      const x0 = Math.max(0, Math.min(srcWidth - 1, Math.floor(sx)));
      const y0 = Math.max(0, Math.min(srcHeight - 1, Math.floor(sy)));
      const x1 = Math.min(srcWidth - 1, x0 + 1);
      const y1 = Math.min(srcHeight - 1, y0 + 1);

      const fx = Math.max(0, Math.min(1, sx - x0));
      const fy = Math.max(0, Math.min(1, sy - y0));

      const i00 = (y0 * srcWidth + x0) * 4;
      const i10 = (y0 * srcWidth + x1) * 4;
      const i01 = (y1 * srcWidth + x0) * 4;
      const i11 = (y1 * srcWidth + x1) * 4;

      const outIdx = (v * dstWidth + u) * 4;
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] * (1 - fx) + src[i10 + c] * fx;
        const bot = src[i01 + c] * (1 - fx) + src[i11 + c] * fx;
        dst[outIdx + c] = Math.round(top * (1 - fy) + bot * fy);
      }
      dst[outIdx + 3] = 255;
    }
  }

  return dst;
}
