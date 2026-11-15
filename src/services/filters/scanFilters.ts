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
 * Applies CamScanner-style presets with local shadow/illumination normalization
 * and manual Brightness/Contrast/Sharpness adjustments.
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
    const radius = Math.max(8, Math.round(Math.min(width, height) / 28));
    const localMean = computeLocalMean(gray, width, height, radius);
    const bias = 10;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const v = gray[i] < localMean[i] - bias ? 0 : 255;
      out[idx] = v;
      out[idx + 1] = v;
      out[idx + 2] = v;
      out[idx + 3] = 255;
    }
    return out;
  }

  // For Magic Color, compute local illumination map to remove shadows across the page
  let localBg: Float32Array | null = null;
  if (filter === 'magic_color') {
    const gray = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      gray[i] = clampByte(0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2]);
    }
    const radius = Math.max(14, Math.round(Math.min(width, height) / 14));
    localBg = computeLocalMean(gray, width, height, radius);
  }

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    let r = src[idx];
    let g = src[idx + 1];
    let b = src[idx + 2];

    if (filter === 'grayscale') {
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      r = luma;
      g = luma;
      b = luma;
    } else if (filter === 'magic_color' && localBg) {
      // Shadow-removal illumination normalization + crisp ink contrast
      const bg = Math.max(40, localBg[i]);
      const gain = Math.min(2.2, 238 / bg);
      r = Math.min(255, r * gain);
      g = Math.min(255, g * gain);
      b = Math.min(255, b * gain);

      // Clean white paper push & text darkening
      r = (r - 135) * 1.24 + 145;
      g = (g - 135) * 1.24 + 145;
      b = (b - 135) * 1.24 + 145;
    }

    r = (r - 128) * contrastFactor + 128 + brightnessOffset;
    g = (g - 128) * contrastFactor + 128 + brightnessOffset;
    b = (b - 128) * contrastFactor + 128 + brightnessOffset;

    out[idx] = clampByte(r);
    out[idx + 1] = clampByte(g);
    out[idx + 2] = clampByte(b);
    out[idx + 3] = 255;
  }

  // Unsharp mask sharpening
  if (adjustments.sharpness > 0 && width > 2 && height > 2) {
    const amount = (adjustments.sharpness / 100) * 0.9;
    const copy = new Uint8Array(out);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const up = ((y - 1) * width + x) * 4;
        const down = ((y + 1) * width + x) * 4;
        const left = (y * width + (x - 1)) * 4;
        const right = (y * width + (x + 1)) * 4;

        for (let c = 0; c < 3; c++) {
          const avg = (copy[up + c] + copy[down + c] + copy[left + c] + copy[right + c]) * 0.25;
          out[idx + c] = clampByte(copy[idx + c] + (copy[idx + c] - avg) * amount);
        }
      }
    }
  }

  return out;
}
