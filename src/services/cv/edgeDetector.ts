import { CropQuad, Point } from '../../types/scanner';
import { getDefaultCropQuad } from './geometry';

interface LineModel {
  // Normal form: nx * x + ny * y = rho, with (nx, ny) unit normal
  nx: number;
  ny: number;
  rho: number;
  score: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function intersectLines(a: LineModel, b: LineModel): Point | null {
  const det = a.nx * b.ny - a.ny * b.nx;
  if (Math.abs(det) < 1e-4) return null;
  const x = (a.rho * b.ny - a.ny * b.rho) / det;
  const y = (a.nx * b.rho - a.rho * b.nx) / det;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function quadArea(q: CropQuad): number {
  const pts = [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];
  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % 4];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) * 0.5;
}

function isConvexQuad(q: CropQuad): boolean {
  const pts = [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const c = pts[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-3) return false;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}

function minCornerCosineError(q: CropQuad): number {
  const pts = [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];
  let maxAbsCos = 0;
  for (let i = 0; i < 4; i++) {
    const prev = pts[(i + 3) % 4];
    const curr = pts[i];
    const next = pts[(i + 1) % 4];
    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 8 || len2 < 8) return 1;
    const cos = Math.abs((v1x * v2x + v1y * v2y) / (len1 * len2));
    if (cos > maxAbsCos) maxAbsCos = cos;
  }
  return maxAbsCos;
}

/**
 * 3x3 Gaussian blur on a single Float32Array channel.
 */
function gaussianBlur3x3(src: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      out[i] =
        (src[i - width - 1] +
          2 * src[i - width] +
          src[i - width + 1] +
          2 * src[i - 1] +
          4 * src[i] +
          2 * src[i + 1] +
          src[i + width - 1] +
          2 * src[i + width] +
          src[i + width + 1]) /
        16;
    }
  }
  return out;
}

/**
 * Detects document corners from an RGBA buffer using:
 * 1. Multi-channel (RGB + Luma) 3x3 Gaussian-smoothed Sobel gradients
 * 2. 1D Non-Maximum Suppression along the dominant gradient axis
 * 3. Directed 4-side Hough line voting (Top, Bottom, Left, Right)
 * 4. Multi-candidate quad scoring by 4-side edge support + boundary contrast
 * 5. Weighted least-squares line refinement for crisp corner intersections
 */
export function detectDocumentQuad(
  rgba: Uint8Array,
  width: number,
  height: number
): CropQuad {
  if (width < 48 || height < 48) {
    return getDefaultCropQuad(width, height, 0.08);
  }

  const total = width * height;
  const rCh = new Float32Array(total);
  const gCh = new Float32Array(total);
  const bCh = new Float32Array(total);
  const luma = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const r = rgba[idx];
    const g = rgba[idx + 1];
    const b = rgba[idx + 2];
    rCh[i] = r;
    gCh[i] = g;
    bCh[i] = b;
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const sr = gaussianBlur3x3(rCh, width, height);
  const sg = gaussianBlur3x3(gCh, width, height);
  const sb = gaussianBlur3x3(bCh, width, height);
  const sl = gaussianBlur3x3(luma, width, height);

  const mag = new Float32Array(total);
  const gradX = new Float32Array(total);
  const gradY = new Float32Array(total);

  const marginX = Math.max(3, Math.floor(width * 0.025));
  const marginY = Math.max(3, Math.floor(height * 0.025));

  let sumMag = 0;
  let sumSqMag = 0;
  let countInterior = 0;

  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;

      const sobel = (ch: Float32Array): [number, number, number] => {
        const gx =
          -ch[i - width - 1] +
          ch[i - width + 1] -
          2 * ch[i - 1] +
          2 * ch[i + 1] -
          ch[i + width - 1] +
          ch[i + width + 1];
        const gy =
          -ch[i - width - 1] -
          2 * ch[i - width] -
          ch[i - width + 1] +
          ch[i + width - 1] +
          2 * ch[i + width] +
          ch[i + width + 1];
        return [gx, gy, Math.hypot(gx, gy)];
      };

      const [lx, ly, lm] = sobel(sl);
      const [rx, ry, rm] = sobel(sr);
      const [gxVal, gyVal, gm] = sobel(sg);
      const [bx, by, bm] = sobel(sb);

      // Pick strongest channel gradient (weighted slightly toward luma for text/paper)
      let bestGx = lx;
      let bestGy = ly;
      let bestM = lm * 1.1;

      if (rm > bestM) {
        bestM = rm;
        bestGx = rx;
        bestGy = ry;
      }
      if (gm > bestM) {
        bestM = gm;
        bestGx = gxVal;
        bestGy = gyVal;
      }
      if (bm > bestM) {
        bestM = bm;
        bestGx = bx;
        bestGy = by;
      }

      mag[i] = bestM;
      gradX[i] = bestGx;
      gradY[i] = bestGy;

      if (x >= marginX && x < width - marginX && y >= marginY && y < height - marginY) {
        sumMag += bestM;
        sumSqMag += bestM * bestM;
        countInterior++;
      }
    }
  }

  if (countInterior === 0) {
    return getDefaultCropQuad(width, height, 0.08);
  }

  const meanMag = sumMag / countInterior;
  const stdMag = Math.sqrt(Math.max(0, sumSqMag / countInterior - meanMag * meanMag));
  const threshold = Math.max(24, meanMag + 1.05 * stdMag);

  // Non-maximum suppression along dominant gradient axis
  const nms = new Float32Array(total);
  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const i = y * width + x;
      const m = mag[i];
      if (m < threshold) continue;
      if (Math.abs(gradX[i]) >= Math.abs(gradY[i])) {
        if (m >= mag[i - 1] && m >= mag[i + 1]) nms[i] = m;
      } else {
        if (m >= mag[i - width] && m >= mag[i + width]) nms[i] = m;
      }
    }
  }

  const cx = width * 0.5;
  const cy = height * 0.5;
  const diag = Math.hypot(width, height);

  // Directed Hough voting for a single side
  const findSideCandidates = (
    side: 'top' | 'bottom' | 'left' | 'right'
  ): LineModel[] => {
    const isHorizontal = side === 'top' || side === 'bottom';
    const angleMinDeg = -28;
    const angleMaxDeg = 28;
    const angleStepDeg = 2;
    const numAngles = Math.floor((angleMaxDeg - angleMinDeg) / angleStepDeg) + 1;
    const rhoStep = 2;
    const maxRho = Math.ceil(diag);
    const numRhos = Math.ceil((2 * maxRho) / rhoStep) + 1;

    const accum = new Float32Array(numAngles * numRhos);
    const cosArr = new Float32Array(numAngles);
    const sinArr = new Float32Array(numAngles);

    for (let a = 0; a < numAngles; a++) {
      const deg = angleMinDeg + a * angleStepDeg;
      const rad = ((isHorizontal ? 90 + deg : deg) * Math.PI) / 180;
      cosArr[a] = Math.cos(rad);
      sinArr[a] = Math.sin(rad);
    }

    const xMin = side === 'right' ? Math.floor(cx * 0.85) : marginX;
    const xMax = side === 'left' ? Math.ceil(cx * 1.15) : width - marginX;
    const yMin = side === 'bottom' ? Math.floor(cy * 0.85) : marginY;
    const yMax = side === 'top' ? Math.ceil(cy * 1.15) : height - marginY;

    const capWeight = threshold * 3.5;

    for (let y = yMin; y < yMax; y++) {
      for (let x = xMin; x < xMax; x++) {
        const i = y * width + x;
        const m = nms[i];
        if (m <= 0) continue;

        const gx = gradX[i];
        const gy = gradY[i];
        const invM = 1 / (Math.hypot(gx, gy) || 1);
        const ux = gx * invM;
        const uy = gy * invM;

        // Edge orientation filter: horizontal edges have vertical gradients; vertical edges have horizontal gradients
        if (isHorizontal && Math.abs(uy) < Math.abs(ux) * 1.1) continue;
        if (!isHorizontal && Math.abs(ux) < Math.abs(uy) * 1.1) continue;

        const w = Math.min(m, capWeight);
        for (let a = 0; a < numAngles; a++) {
          const align = Math.abs(ux * cosArr[a] + uy * sinArr[a]);
          if (align < 0.88) continue;
          const rho = x * cosArr[a] + y * sinArr[a];
          const rBin = Math.round((rho + maxRho) / rhoStep);
          if (rBin >= 0 && rBin < numRhos) {
            accum[a * numRhos + rBin] += w * align;
          }
        }
      }
    }

    // Extract top 4 distinct peaks
    const peaks: LineModel[] = [];
    for (let k = 0; k < 4; k++) {
      let bestVal = 0;
      let bestA = -1;
      let bestR = -1;

      for (let a = 0; a < numAngles; a++) {
        const offset = a * numRhos;
        for (let r = 0; r < numRhos; r++) {
          const v = accum[offset + r];
          if (v > bestVal) {
            bestVal = v;
            bestA = a;
            bestR = r;
          }
        }
      }

      if (bestVal <= 0 || bestA < 0) break;

      const rho = bestR * rhoStep - maxRho;
      peaks.push({
        nx: cosArr[bestA],
        ny: sinArr[bestA],
        rho,
        score: bestVal,
      });

      // Suppress neighborhood so we get genuinely different line candidates
      const suppressR = Math.ceil(10 / rhoStep);
      for (let a = Math.max(0, bestA - 3); a <= Math.min(numAngles - 1, bestA + 3); a++) {
        const offset = a * numRhos;
        for (
          let r = Math.max(0, bestR - suppressR);
          r <= Math.min(numRhos - 1, bestR + suppressR);
          r++
        ) {
          accum[offset + r] = 0;
        }
      }
    }

    return peaks;
  };

  const topLines = findSideCandidates('top');
  const bottomLines = findSideCandidates('bottom');
  const leftLines = findSideCandidates('left');
  const rightLines = findSideCandidates('right');

  // Ensure each side has at least a clean inset fallback
  if (topLines.length === 0) {
    topLines.push({ nx: 0, ny: 1, rho: height * 0.08, score: 1 });
  }
  if (bottomLines.length === 0) {
    bottomLines.push({ nx: 0, ny: 1, rho: height * 0.92, score: 1 });
  }
  if (leftLines.length === 0) {
    leftLines.push({ nx: 1, ny: 0, rho: width * 0.08, score: 1 });
  }
  if (rightLines.length === 0) {
    rightLines.push({ nx: 1, ny: 0, rho: width * 0.92, score: 1 });
  }

  // Evaluate edge support + contrast along one segment
  const scoreSegment = (p1: Point, p2: Point): { coverage: number; contrast: number } => {
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segLen < 12) return { coverage: 0, contrast: 0 };

    const samples = 24;
    const dx = (p2.x - p1.x) / segLen;
    const dy = (p2.y - p1.y) / segLen;
    // Unit normal to segment
    const nx = -dy;
    const ny = dx;

    let hits = 0;
    let contrastSum = 0;
    let contrastCount = 0;

    for (let s = 1; s < samples; s++) {
      const t = s / samples;
      const sx = p1.x + (p2.x - p1.x) * t;
      const sy = p1.y + (p2.y - p1.y) * t;

      let bestEdge = 0;
      for (let d = -2; d <= 2; d++) {
        const px = Math.round(sx + nx * d);
        const py = Math.round(sy + ny * d);
        if (px < 2 || px >= width - 2 || py < 2 || py >= height - 2) continue;
        const i = py * width + px;
        const m = mag[i];
        if (m < threshold * 0.75) continue;
        const align = Math.abs((gradX[i] * nx + gradY[i] * ny) / (m || 1));
        if (align > 0.7) {
          const val = m * align;
          if (val > bestEdge) bestEdge = val;
        }
      }
      if (bestEdge > 0) hits++;

      const ix1 = Math.round(sx + nx * 4);
      const iy1 = Math.round(sy + ny * 4);
      const ix2 = Math.round(sx - nx * 4);
      const iy2 = Math.round(sy - ny * 4);
      if (
        ix1 >= 0 &&
        ix1 < width &&
        iy1 >= 0 &&
        iy1 < height &&
        ix2 >= 0 &&
        ix2 < width &&
        iy2 >= 0 &&
        iy2 < height
      ) {
        contrastSum += Math.abs(sl[iy1 * width + ix1] - sl[iy2 * width + ix2]);
        contrastCount++;
      }
    }

    return {
      coverage: hits / (samples - 1),
      contrast: contrastCount > 0 ? contrastSum / contrastCount : 0,
    };
  };

  let bestQuad: CropQuad | null = null;
  let bestScore = -1;
  let bestLines: [LineModel, LineModel, LineModel, LineModel] | null = null;

  const imgArea = width * height;

  for (const tLine of topLines) {
    for (const bLine of bottomLines) {
      for (const lLine of leftLines) {
        for (const rLine of rightLines) {
          const tl = intersectLines(tLine, lLine);
          const tr = intersectLines(tLine, rLine);
          const br = intersectLines(bLine, rLine);
          const bl = intersectLines(bLine, lLine);
          if (!tl || !tr || !br || !bl) continue;

          const pts = [tl, tr, br, bl];
          let outOfBounds = false;
          for (const p of pts) {
            if (
              p.x < -width * 0.02 ||
              p.x > width * 1.02 ||
              p.y < -height * 0.02 ||
              p.y > height * 1.02
            ) {
              outOfBounds = true;
              break;
            }
          }
          if (outOfBounds) continue;

          const candidate: CropQuad = {
            topLeft: tl,
            topRight: tr,
            bottomRight: br,
            bottomLeft: bl,
          };

          if (!isConvexQuad(candidate)) continue;
          const areaRatio = quadArea(candidate) / imgArea;
          if (areaRatio < 0.12 || areaRatio > 0.94) continue;
          if (minCornerCosineError(candidate) > 0.58) continue; // ~54..126 deg corners

          const sTop = scoreSegment(tl, tr);
          const sRight = scoreSegment(tr, br);
          const sBottom = scoreSegment(br, bl);
          const sLeft = scoreSegment(bl, tl);

          const coverages = [sTop.coverage, sRight.coverage, sBottom.coverage, sLeft.coverage];
          const minCov = Math.min(...coverages);
          const meanCov = (coverages[0] + coverages[1] + coverages[2] + coverages[3]) * 0.25;
          const meanContrast =
            (sTop.contrast + sRight.contrast + sBottom.contrast + sLeft.contrast) * 0.25;

          const qcx = (tl.x + tr.x + br.x + bl.x) * 0.25;
          const qcy = (tl.y + tr.y + br.y + bl.y) * 0.25;
          const centerBonus = 1 - 0.2 * (Math.hypot(qcx - cx, qcy - cy) / diag);

          // Strong reward for all 4 sides having real aligned edges (minCov + meanCov)
          const totalScore =
            (minCov * 1.6 + meanCov * 2.2 + Math.min(1, meanContrast / 45) * 0.5) *
            centerBonus;

          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestQuad = candidate;
            bestLines = [tLine, rLine, bLine, lLine];
          }
        }
      }
    }
  }

  if (!bestQuad || !bestLines || bestScore < 0.65) {
    return getDefaultCropQuad(width, height, 0.08);
  }

  // Refine each of the 4 winning lines via weighted least-squares on nearby aligned edge pixels
  const refineLine = (p1: Point, p2: Point, fallback: LineModel): LineModel => {
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segLen < 16) return fallback;
    const dx = (p2.x - p1.x) / segLen;
    const dy = (p2.y - p1.y) / segLen;
    const nx = -dy;
    const ny = dx;

    let sw = 0;
    let sx = 0;
    let sy = 0;
    const pts: Array<{ x: number; y: number; w: number }> = [];

    const steps = Math.min(60, Math.max(20, Math.round(segLen / 3)));
    for (let s = 2; s < steps - 1; s++) {
      const t = s / steps;
      const baseX = p1.x + (p2.x - p1.x) * t;
      const baseY = p1.y + (p2.y - p1.y) * t;

      let bestW = 0;
      let bestX = 0;
      let bestY = 0;

      for (let d = -3; d <= 3; d++) {
        const px = Math.round(baseX + nx * d);
        const py = Math.round(baseY + ny * d);
        if (px < 2 || px >= width - 2 || py < 2 || py >= height - 2) continue;
        const i = py * width + px;
        const m = mag[i];
        if (m < threshold * 0.75) continue;
        const align = Math.abs((gradX[i] * nx + gradY[i] * ny) / (m || 1));
        if (align > 0.75 && m * align > bestW) {
          bestW = m * align;
          bestX = px;
          bestY = py;
        }
      }

      if (bestW > 0) {
        pts.push({ x: bestX, y: bestY, w: bestW });
        sw += bestW;
        sx += bestW * bestX;
        sy += bestW * bestY;
      }
    }

    if (pts.length < 6 || sw <= 0) return fallback;
    const mx = sx / sw;
    const my = sy / sw;

    let cxx = 0;
    let cyy = 0;
    let cxy = 0;
    for (const p of pts) {
      const vx = p.x - mx;
      const vy = p.y - my;
      cxx += p.w * vx * vx;
      cyy += p.w * vy * vy;
      cxy += p.w * vx * vy;
    }

    // Smallest eigenvector of 2x2 covariance matrix gives the line normal
    const trace = cxx + cyy;
    const det = cxx * cyy - cxy * cxy;
    const disc = Math.sqrt(Math.max(0, trace * trace * 0.25 - det));
    const lambdaMin = trace * 0.5 - disc;

    let rnx = cxy;
    let rny = lambdaMin - cxx;
    if (Math.hypot(rnx, rny) < 1e-6) {
      rnx = lambdaMin - cyy;
      rny = cxy;
    }
    const len = Math.hypot(rnx, rny);
    if (len < 1e-6) return fallback;
    rnx /= len;
    rny /= len;

    // Keep orientation close to fallback
    if (Math.abs(rnx * fallback.nx + rny * fallback.ny) < 0.92) {
      return fallback;
    }

    return {
      nx: rnx,
      ny: rny,
      rho: rnx * mx + rny * my,
      score: fallback.score,
    };
  };

  const refinedTop = refineLine(bestQuad.topLeft, bestQuad.topRight, bestLines[0]);
  const refinedRight = refineLine(bestQuad.topRight, bestQuad.bottomRight, bestLines[1]);
  const refinedBottom = refineLine(bestQuad.bottomRight, bestQuad.bottomLeft, bestLines[2]);
  const refinedLeft = refineLine(bestQuad.bottomLeft, bestQuad.topLeft, bestLines[3]);

  const rtl = intersectLines(refinedTop, refinedLeft);
  const rtr = intersectLines(refinedTop, refinedRight);
  const rbr = intersectLines(refinedBottom, refinedRight);
  const rbl = intersectLines(refinedBottom, refinedLeft);

  if (rtl && rtr && rbr && rbl) {
    const refinedQuad: CropQuad = {
      topLeft: { x: clamp(rtl.x, 0, width - 1), y: clamp(rtl.y, 0, height - 1) },
      topRight: { x: clamp(rtr.x, 0, width - 1), y: clamp(rtr.y, 0, height - 1) },
      bottomRight: { x: clamp(rbr.x, 0, width - 1), y: clamp(rbr.y, 0, height - 1) },
      bottomLeft: { x: clamp(rbl.x, 0, width - 1), y: clamp(rbl.y, 0, height - 1) },
    };
    if (isConvexQuad(refinedQuad) && quadArea(refinedQuad) / imgArea >= 0.12) {
      return refinedQuad;
    }
  }

  return {
    topLeft: {
      x: clamp(bestQuad.topLeft.x, 0, width - 1),
      y: clamp(bestQuad.topLeft.y, 0, height - 1),
    },
    topRight: {
      x: clamp(bestQuad.topRight.x, 0, width - 1),
      y: clamp(bestQuad.topRight.y, 0, height - 1),
    },
    bottomRight: {
      x: clamp(bestQuad.bottomRight.x, 0, width - 1),
      y: clamp(bestQuad.bottomRight.y, 0, height - 1),
    },
    bottomLeft: {
      x: clamp(bestQuad.bottomLeft.x, 0, width - 1),
      y: clamp(bestQuad.bottomLeft.y, 0, height - 1),
    },
  };
}
