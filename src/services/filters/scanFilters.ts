import {
  AdjustmentSettings,
  FilterPreset,
  NormalizedStroke,
  StampPreset,
} from '../../types/scanner';

function drawNormalizedStrokes(
  out: Uint8Array,
  width: number,
  height: number,
  strokes: NormalizedStroke[],
  rgb: [number, number, number],
  radius: number,
  region: { x0: number; y0: number; w: number; h: number }
): void {
  const r2 = radius * radius;
  const paintDisc = (cx: number, cy: number) => {
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          const idx = (y * width + x) * 4;
          out[idx] = rgb[0];
          out[idx + 1] = rgb[1];
          out[idx + 2] = rgb[2];
        }
      }
    }
  };

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    for (let i = 0; i < stroke.length; i++) {
      const p1x = region.x0 + stroke[i].x * region.w;
      const p1y = region.y0 + stroke[i].y * region.h;
      if (i === 0) {
        paintDisc(p1x, p1y);
        continue;
      }
      const p0x = region.x0 + stroke[i - 1].x * region.w;
      const p0y = region.y0 + stroke[i - 1].y * region.h;
      const dist = Math.hypot(p1x - p0x, p1y - p0y);
      const steps = Math.max(1, Math.ceil(dist / Math.max(1, radius * 0.45)));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        paintDisc(p0x + (p1x - p0x) * t, p0y + (p1y - p0y) * t);
      }
    }
  }
}

const STAMP_FONT_5X7: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
};

function drawRubberStamp(
  out: Uint8Array,
  width: number,
  height: number,
  stamp: StampPreset
): void {
  if (stamp === 'none' || width < 60 || height < 60) return;

  const isRed = stamp === 'CONFIDENTIAL';
  const sr = isRed ? 185 : 21;
  const sg = isRed ? 28 : 128;
  const sb = isRed ? 28 : 61;

  const scale = Math.max(2, Math.round(Math.min(width, height) / 260));
  const charW = 5 * scale;
  const charH = 7 * scale;
  const gap = scale * 2;
  const padX = scale * 6;
  const padY = scale * 5;
  const textW = stamp.length * charW + Math.max(0, stamp.length - 1) * gap;
  const boxW = textW + padX * 2;
  const boxH = charH + padY * 2;

  const margin = Math.max(12, Math.round(Math.min(width, height) * 0.04));
  const startX = Math.max(4, width - margin - boxW);
  const startY = Math.max(4, height - margin - boxH);
  const borderT = Math.max(2, scale);

  const blendPixel = (x: number, y: number, alpha: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = (y * width + x) * 4;
    out[idx] = Math.round(out[idx] * (1 - alpha) + sr * alpha);
    out[idx + 1] = Math.round(out[idx + 1] * (1 - alpha) + sg * alpha);
    out[idx + 2] = Math.round(out[idx + 2] * (1 - alpha) + sb * alpha);
  };

  // Border box
  for (let y = startY; y < startY + boxH; y++) {
    for (let x = startX; x < startX + boxW; x++) {
      const onBorder =
        x < startX + borderT ||
        x >= startX + boxW - borderT ||
        y < startY + borderT ||
        y >= startY + boxH - borderT;
      if (onBorder) {
        blendPixel(x, y, 0.78);
      } else {
        blendPixel(x, y, 0.06);
      }
    }
  }

  // Bitmap letters
  let cursorX = startX + padX;
  const textY = startY + padY;
  for (const ch of stamp) {
    const glyph = STAMP_FONT_5X7[ch];
    if (glyph) {
      for (let gy = 0; gy < 7; gy++) {
        const row = glyph[gy];
        for (let gx = 0; gx < 5; gx++) {
          if (row[gx] === '1') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                blendPixel(cursorX + gx * scale + sx, textY + gy * scale + sy, 0.82);
              }
            }
          }
        }
      }
    }
    cursorX += charW + gap;
  }
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Computes a fast O(W*H) local mean illumination map using an integral image.
 */
function computeLocalMean(
  gray: Uint8Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const stride = width + 1;
  const integral = new Float64Array((height + 1) * stride);

  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  const mean = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0];
      mean[y * width + x] = sum / area;
    }
  }
  return mean;
}

/**
 * Estimates local paper illumination by taking a separable 1D local max
 * (ignoring dark ink/text) followed by a smooth box average.
 */
function computeLocalPaperBackground(
  gray: Uint8Array,
  width: number,
  height: number,
  radius: number
): Float32Array {
  const total = width * height;
  const horizMax = new Uint8Array(total);
  const deque = new Int32Array(width);

  // Horizontal sliding window max (O(W*H))
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let head = 0;
    let tail = 0;
    for (let x = 0; x < width + radius; x++) {
      if (x < width) {
        const val = gray[row + x];
        while (tail > head && gray[row + deque[tail - 1]] <= val) {
          tail--;
        }
        deque[tail++] = x;
      }
      const outX = x - radius;
      if (outX >= 0) {
        while (head < tail && deque[head] < outX - radius) {
          head++;
        }
        horizMax[row + outX] = gray[row + deque[head]];
      }
    }
  }

  // Vertical sliding window max (O(W*H))
  const localMax = new Uint8Array(total);
  const vDeque = new Int32Array(height);
  for (let x = 0; x < width; x++) {
    let head = 0;
    let tail = 0;
    for (let y = 0; y < height + radius; y++) {
      if (y < height) {
        const val = horizMax[y * width + x];
        while (tail > head && horizMax[vDeque[tail - 1] * width + x] <= val) {
          tail--;
        }
        vDeque[tail++] = y;
      }
      const outY = y - radius;
      if (outY >= 0) {
        while (head < tail && vDeque[head] < outY - radius) {
          head++;
        }
        localMax[outY * width + x] = horizMax[vDeque[head] * width + x];
      }
    }
  }

  // Smooth the morphological max map so illumination transitions have zero banding
  const smoothRadius = Math.max(4, Math.round(radius * 0.75));
  return computeLocalMean(localMax, width, height, smoothRadius);
}

/**
 * Applies CamScanner-style presets with morphological paper-background
 * shadow removal, anti-aliased B&W ink, and crisp unsharp masking.
 */
export function applyScanFilterToRgba(
  src: Uint8Array,
  width: number,
  height: number,
  filter: FilterPreset,
  adjustments: AdjustmentSettings
): Uint8Array {
  const totalPixels = width * height;
  const out = new Uint8Array(src.length);

  const brightnessOffset = (adjustments.brightness / 100) * 80;
  const contrastFactor = Math.pow((adjustments.contrast + 100) / 100, 1.35);

  if (filter === 'bw_scan') {
    const gray = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const luma = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
      gray[i] = clampByte((luma - 128) * contrastFactor + 128 + brightnessOffset);
    }
    const radius = Math.max(8, Math.round(Math.min(width, height) / 26));
    const localMean = computeLocalMean(gray, width, height, radius);
    const bias = 9;
    const ramp = 10;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const diff = gray[i] - (localMean[i] - bias);
      let v: number;
      if (diff <= -ramp) {
        v = 0;
      } else if (diff >= ramp) {
        v = 255;
      } else {
        const t = (diff + ramp) / (2 * ramp);
        // Smoothstep for crisp, anti-aliased laser-scan edges
        const s = t * t * (3 - 2 * t);
        v = Math.round(s * 255);
      }
      out[idx] = v;
      out[idx + 1] = v;
      out[idx + 2] = v;
      out[idx + 3] = 255;
    }
    return out;
  }

  let paperBg: Float32Array | null = null;
  if (
    filter === 'magic_color' ||
    filter === 'grayscale' ||
    filter === 'receipt' ||
    filter === 'whiteboard' ||
    filter === 'eco_print'
  ) {
    const gray = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      gray[i] = clampByte(0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]);
    }
    const radius = Math.max(10, Math.round(Math.min(width, height) / 26));
    paperBg = computeLocalPaperBackground(gray, width, height, radius);
  }

  const whiteningStrength = Math.max(0, Math.min(100, adjustments.whitening ?? 35)) / 100;
  const targetWhite = 232 + whiteningStrength * 22; // 232..254

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    let r = src[idx];
    let g = src[idx + 1];
    let b = src[idx + 2];

    if (filter === 'grayscale') {
      let luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (paperBg) {
        const bg = Math.max(45, paperBg[i]);
        const normalized = Math.min(255, (luma * targetWhite) / bg);
        const blend = 0.45 + whiteningStrength * 0.4;
        luma = luma * (1 - blend) + normalized * blend;
        luma = (luma - 130) * 1.18 + 136;
      }
      r = luma;
      g = luma;
      b = luma;
    } else if (filter === 'receipt' && paperBg) {
      // Thermal receipt mode: flatten faded paper & darken faint ink
      let luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const bg = Math.max(45, paperBg[i]);
      const normalized = Math.min(255, (luma * (targetWhite + 4)) / bg);
      // Push light paper to pure white while pulling ink darker
      luma = (normalized - 155) * 1.55 + 160;
      r = luma;
      g = luma;
      b = luma;
    } else if (filter === 'whiteboard' && paperBg) {
      // Whiteboard mode: strong glare/shadow flattening + vivid marker colors
      const bg = Math.max(45, paperBg[i]);
      const gain = Math.min(2.3, Math.max(0.85, (targetWhite + 4) / bg));
      r = Math.min(255, r * gain);
      g = Math.min(255, g * gain);
      b = Math.min(255, b * gain);

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const satBoost = 1.32;
      r = luma + (r - luma) * satBoost;
      g = luma + (g - luma) * satBoost;
      b = luma + (b - luma) * satBoost;

      r = (r - 140) * 1.28 + 150;
      g = (g - 140) * 1.28 + 150;
      b = (b - 140) * 1.28 + 150;
    } else if (filter === 'eco_print' && paperBg) {
      // Eco / Light Ink mode: clean pure-white paper + lighter ink fills to save toner/ink
      const bg = Math.max(45, paperBg[i]);
      const gain = Math.min(2.35, Math.max(0.9, 254 / bg));
      r = Math.min(255, r * gain);
      g = Math.min(255, g * gain);
      b = Math.min(255, b * gain);

      // Gently lift midtones/blacks (~20%) so heavy fills print cleanly with less ink
      r = r > 225 ? 255 : Math.min(255, r * 0.85 + 38);
      g = g > 225 ? 255 : Math.min(255, g * 0.85 + 38);
      b = b > 225 ? 255 : Math.min(255, b * 0.85 + 38);
    } else if (filter === 'magic_color' && paperBg) {
      // Literal flatbed-scan look: neutralize warm/gray paper cast -> pure white, keep ink & colors crisp
      const bg = Math.max(45, paperBg[i]);
      const srcLuma = 0.299 * r + 0.587 * g + 0.114 * b;
      const ratio = srcLuma / bg;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      const gain = Math.min(2.25, Math.max(0.88, (targetWhite + 4) / bg));
      r = Math.min(255, r * gain);
      g = Math.min(255, g * gain);
      b = Math.min(255, b * gain);

      // Boost color saturation so stamps, signatures, and logos stay vivid
      const normLuma = 0.299 * r + 0.587 * g + 0.114 * b;
      const satBoost = 1.24;
      r = normLuma + (r - normLuma) * satBoost;
      g = normLuma + (g - normLuma) * satBoost;
      b = normLuma + (b - normLuma) * satBoost;

      // Deepen ink & lift highlights
      const shapeInk = (v: number): number =>
        v < 155 ? v * (0.86 - whiteningStrength * 0.08) : (v - 155) * 1.25 + 155;
      r = shapeInk(r);
      g = shapeInk(g);
      b = shapeInk(b);

      // Neutralize low-chroma paper background smoothly to pure (255, 255, 255) white
      const paperFloor = 0.84 - whiteningStrength * 0.08;
      if (ratio >= paperFloor && chroma < 48) {
        const span = Math.max(0.06, 0.95 - paperFloor);
        const rawT = Math.min(1, Math.max(0, (ratio - paperFloor) / span));
        const whiteBlend = rawT * rawT * (3 - 2 * rawT);
        r = r * (1 - whiteBlend) + 255 * whiteBlend;
        g = g * (1 - whiteBlend) + 255 * whiteBlend;
        b = b * (1 - whiteBlend) + 255 * whiteBlend;
      }
    }

    r = (r - 128) * contrastFactor + 128 + brightnessOffset;
    g = (g - 128) * contrastFactor + 128 + brightnessOffset;
    b = (b - 128) * contrastFactor + 128 + brightnessOffset;

    out[idx] = clampByte(r);
    out[idx + 1] = clampByte(g);
    out[idx + 2] = clampByte(b);
    out[idx + 3] = 255;
  }

  // Unsharp mask sharpening: automatic subtle clarity for scan presets + user slider
  const baseSharp =
    filter === 'magic_color' || filter === 'whiteboard'
      ? 0.28
      : filter === 'receipt' || filter === 'eco_print'
        ? 0.35
        : filter === 'grayscale'
          ? 0.2
          : 0;
  const sharpAmount = baseSharp + (adjustments.sharpness / 100) * 0.85;

  if (sharpAmount > 0 && width > 2 && height > 2) {
    const copy = new Uint8Array(out);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const up = ((y - 1) * width + x) * 4;
        const down = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const avg =
            (copy[up + c] + copy[down + c] + copy[left + c] + copy[right + c]) * 0.25;
          out[idx + c] = clampByte(copy[idx + c] + (copy[idx + c] - avg) * sharpAmount);
        }
      }
    }
  }

  // Selective despeckle & faint bleed-through suppression
  if (adjustments.despeckle && width > 2 && height > 2) {
    const snap = new Uint8Array(out);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const luma = 0.299 * snap[idx] + 0.587 * snap[idx + 1] + 0.114 * snap[idx + 2];
        if (luma >= 235) continue;

        const nUp = ((y - 1) * width + x) * 4;
        const nDown = ((y + 1) * width + x) * 4;
        const nLeft = (y * width + (x - 1)) * 4;
        const nRight = (y * width + (x + 1)) * 4;

        const nl = [
          0.299 * snap[nUp] + 0.587 * snap[nUp + 1] + 0.114 * snap[nUp + 2],
          0.299 * snap[nDown] + 0.587 * snap[nDown + 1] + 0.114 * snap[nDown + 2],
          0.299 * snap[nLeft] + 0.587 * snap[nLeft + 1] + 0.114 * snap[nLeft + 2],
          0.299 * snap[nRight] + 0.587 * snap[nRight + 1] + 0.114 * snap[nRight + 2],
        ];
        const brightNeighbors = nl.filter((v) => v >= 205).length;

        // Suppress isolated dark specks or faint back-side bleed-through surrounded by clean paper
        if (brightNeighbors >= 3 || (luma >= 165 && brightNeighbors >= 2)) {
          out[idx] = Math.round((snap[nUp] + snap[nDown] + snap[nLeft] + snap[nRight]) * 0.25);
          out[idx + 1] = Math.round(
            (snap[nUp + 1] + snap[nDown + 1] + snap[nLeft + 1] + snap[nRight + 1]) * 0.25
          );
          out[idx + 2] = Math.round(
            (snap[nUp + 2] + snap[nDown + 2] + snap[nLeft + 2] + snap[nRight + 2]) * 0.25
          );
        }
      }
    }
  }

  // Clean outer margins (suppresses dark scanner borders & edge finger tips)
  if (adjustments.cleanMargins && width >= 30 && height >= 30) {
    const mx = Math.max(2, Math.round(width * 0.028));
    const my = Math.max(2, Math.round(height * 0.028));
    const marginLimit = Math.min(mx, my);
    const feather = Math.min(4, Math.max(1, Math.floor(marginLimit / 2)));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distEdge = Math.min(x, width - 1 - x, y, height - 1 - y);
        if (distEdge < marginLimit) {
          const idx = (y * width + x) * 4;
          const t =
            distEdge > marginLimit - feather
              ? (marginLimit - distEdge) / feather
              : 1;
          out[idx] = Math.round(out[idx] * (1 - t) + 255 * t);
          out[idx + 1] = Math.round(out[idx + 1] * (1 - t) + 255 * t);
          out[idx + 2] = Math.round(out[idx + 2] * (1 - t) + 255 * t);
        }
      }
    }
  }

  if (adjustments.eraserStrokes && adjustments.eraserStrokes.length > 0) {
    const brushRadius = Math.max(6, Math.round(Math.min(width, height) * 0.02));
    drawNormalizedStrokes(
      out,
      width,
      height,
      adjustments.eraserStrokes,
      [255, 255, 255],
      brushRadius,
      { x0: 0, y0: 0, w: width, h: height }
    );
  }

  if (adjustments.stamp && adjustments.stamp !== 'none') {
    drawRubberStamp(out, width, height, adjustments.stamp);
  }

  if (adjustments.signatureStrokes && adjustments.signatureStrokes.length > 0) {
    const sigW = Math.round(width * 0.34);
    const sigH = Math.round(sigW * 0.45);
    const margin = Math.max(12, Math.round(Math.min(width, height) * 0.04));
    const hasStamp = adjustments.stamp && adjustments.stamp !== 'none';
    const x0 = hasStamp ? margin : Math.max(4, width - margin - sigW);
    const y0 = Math.max(4, height - margin - sigH);
    const penRadius = Math.max(1.5, Math.min(width, height) * 0.0032);
    drawNormalizedStrokes(
      out,
      width,
      height,
      adjustments.signatureStrokes,
      [15, 23, 42],
      penRadius,
      { x0, y0, w: sigW, h: sigH }
    );
  }

  return out;
}
