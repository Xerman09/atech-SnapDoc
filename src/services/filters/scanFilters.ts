import { AdjustmentSettings, FilterPreset } from '../../types/scanner';

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Applies integral-image local adaptive thresholding for crisp B&W document scans.
 */
function applyAdaptiveBwThreshold(
  gray: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const integral = new Float64Array((width + 1) * (height + 1));
  const stride = width + 1;

  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      rowSum += gray[(y - 1) * width + (x - 1)];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  const radius = Math.max(8, Math.round(Math.min(width, height) / 36));
  const bias = 12;
  const out = new Uint8Array(width * height);

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

      const localMean = sum / area;
      const px = gray[y * width + x];
      out[y * width + x] = px < localMean - bias ? 0 : 255;
    }
  }

  return out;
}

/**
 * Applies CamScanner-style presets and manual Brightness/Contrast/Sharpness
 * to an RGBA pixel buffer, returning a new RGBA Uint8Array.
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
      const adjusted = (luma - 128) * contrastFactor + 128 + brightnessOffset;
      gray[i] = clampByte(adjusted);
    }
    const bw = applyAdaptiveBwThreshold(gray, width, height);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const v = bw[i];
      out[idx] = v;
      out[idx + 1] = v;
      out[idx + 2] = v;
      out[idx + 3] = 255;
    }
    return out;
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
    } else if (filter === 'magic_color') {
      // Boost contrast & brighten paper background while keeping ink crisp
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const boost = luma > 165 ? 1.18 : 0.92;
      r = (r - 128) * 1.28 + 128 * boost;
      g = (g - 128) * 1.28 + 128 * boost;
      b = (b - 128) * 1.28 + 128 * boost;
    }

    // Apply user brightness & contrast
    r = (r - 128) * contrastFactor + 128 + brightnessOffset;
    g = (g - 128) * contrastFactor + 128 + brightnessOffset;
    b = (b - 128) * contrastFactor + 128 + brightnessOffset;

    out[idx] = clampByte(r);
    out[idx + 1] = clampByte(g);
    out[idx + 2] = clampByte(b);
    out[idx + 3] = 255;
  }

  // Optional unsharp-mask pass when sharpness > 0
  if (adjustments.sharpness > 0 && width > 2 && height > 2) {
    const amount = (adjustments.sharpness / 100) * 0.85;
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
