import { describe, expect, it } from 'vitest';
import { detectDocumentQuad } from '../services/cv/edgeDetector';
import {
  orderQuadCorners,
  warpPerspectiveRgba,
} from '../services/cv/geometry';
import { applyScanFilterToRgba } from '../services/filters/scanFilters';

describe('CV geometry and scan filter engine', () => {
  it('orders 4 unordered points into topLeft, topRight, bottomRight, bottomLeft', () => {
    const quad = orderQuadCorners([
      { x: 100, y: 200 },
      { x: 10, y: 20 },
      { x: 10, y: 200 },
      { x: 100, y: 20 },
    ]);
    expect(quad.topLeft).toEqual({ x: 10, y: 20 });
    expect(quad.topRight).toEqual({ x: 100, y: 20 });
    expect(quad.bottomRight).toEqual({ x: 100, y: 200 });
    expect(quad.bottomLeft).toEqual({ x: 10, y: 200 });
  });

  it('warps an RGBA buffer into target dimensions', () => {
    const src = new Uint8Array(4 * 4 * 4).fill(200);
    const dst = warpPerspectiveRgba(
      src,
      4,
      4,
      {
        topLeft: { x: 0, y: 0 },
        topRight: { x: 3, y: 0 },
        bottomRight: { x: 3, y: 3 },
        bottomLeft: { x: 0, y: 3 },
      },
      4,
      4
    );
    expect(dst.length).toBe(4 * 4 * 4);
    expect(dst[0]).toBe(200);
    expect(dst[3]).toBe(255);
  });

  it('applies grayscale and bw_scan filters cleanly', () => {
    const src = new Uint8Array([
      250, 250, 250, 255,
      20, 40, 60, 255,
      240, 240, 240, 255,
      10, 10, 10, 255,
    ]);

    const gray = applyScanFilterToRgba(src, 2, 2, 'grayscale', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
    });
    expect(gray[4]).toBe(gray[5]);
    expect(gray[5]).toBe(gray[6]);

    const bw = applyScanFilterToRgba(src, 2, 2, 'bw_scan', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
    });
    for (let i = 0; i < 4; i++) {
      const val = bw[i * 4];
      expect(val === 0 || val === 255).toBe(true);
    }
  });

  it('detects document corners accurately even with a distracting border edge', () => {
    const w = 160;
    const h = 120;
    const rgba = new Uint8Array(w * h * 4);

    // Fill with warm wooden desk color + a bright strip on the far left edge (like a desk edge)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const isLeftStrip = x < 12;
        rgba[idx] = isLeftStrip ? 235 : 135;
        rgba[idx + 1] = isLeftStrip ? 235 : 105;
        rgba[idx + 2] = isLeftStrip ? 235 : 80;
        rgba[idx + 3] = 255;
      }
    }

    // Draw a crisp document card inside [35..125] x [25..95]
    for (let y = 25; y <= 95; y++) {
      for (let x = 35; x <= 125; x++) {
        const idx = (y * w + x) * 4;
        rgba[idx] = 240;
        rgba[idx + 1] = 242;
        rgba[idx + 2] = 245;
        rgba[idx + 3] = 255;
      }
    }

    const quad = detectDocumentQuad(rgba, w, h);
    expect(Math.abs(quad.topLeft.x - 35)).toBeLessThanOrEqual(4);
    expect(Math.abs(quad.topLeft.y - 25)).toBeLessThanOrEqual(4);
    expect(Math.abs(quad.bottomRight.x - 125)).toBeLessThanOrEqual(4);
    expect(Math.abs(quad.bottomRight.y - 95)).toBeLessThanOrEqual(4);
  });

  it('applies receipt and whiteboard scan presets with whitening', () => {
    const src = new Uint8Array([
      210, 210, 195, 255,
      60, 60, 60, 255,
      205, 205, 190, 255,
      40, 80, 180, 255,
    ]);

    const receipt = applyScanFilterToRgba(src, 2, 2, 'receipt', {
      brightness: 0,
      contrast: 0,
      sharpness: 15,
      whitening: 60,
    });
    expect(receipt[0]).toBeGreaterThan(220);
    expect(receipt[0]).toBe(receipt[1]); // monochrome thermal output

    const whiteboard = applyScanFilterToRgba(src, 2, 2, 'whiteboard', {
      brightness: 0,
      contrast: 0,
      sharpness: 15,
      whitening: 50,
    });
    expect(whiteboard[0]).toBeGreaterThan(220);
    // Blue marker pixel remains strongly blue-dominant
    expect(whiteboard[14]).toBeGreaterThan(whiteboard[12]);

    const eco = applyScanFilterToRgba(src, 2, 2, 'eco_print', {
      brightness: 0,
      contrast: 0,
      sharpness: 15,
      whitening: 50,
    });
    expect(eco[0]).toBe(255);
    expect(eco[4]).toBeGreaterThan(60); // lighter ink fill for toner/ink saving
  });
});
