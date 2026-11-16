import { AdjustmentSettings, FilterPreset } from '../../types/scanner';

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
    filter === 'whiteboard'
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
    } else if (filter === 'magic_color' && paperBg) {
      // Flatten uneven shadows using paper-background estimate (no ink halos)
      const bg = Math.max(45, paperBg[i]);
      const gain = Math.min(2.15, Math.max(0.85, targetWhite / bg));
      r = Math.min(255, r * gain);
      g = Math.min(255, g * gain);
      b = Math.min(255, b * gain);

      // Gentle document white-point lift & ink deepening
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const satBoost = 1.16;
      r = luma + (r - luma) * satBoost;
      g = luma + (g - luma) * satBoost;
      b = luma + (b - luma) * satBoost;

      const contrastBoost = 1.16 + whiteningStrength * 0.1;
      r = (r - 132) * contrastBoost + 138 + whiteningStrength * 6;
      g = (g - 132) * contrastBoost + 138 + whiteningStrength * 6;
      b = (b - 132) * contrastBoost + 138 + whiteningStrength * 6;
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
      : filter === 'receipt'
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

  return out;
}
