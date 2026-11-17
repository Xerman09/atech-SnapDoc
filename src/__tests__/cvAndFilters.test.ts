import { describe, expect, it } from 'vitest';
import {
  detectDocumentQuad,
  shouldRotate90ForUprightText,
} from '../services/cv/edgeDetector';
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

  it('suppresses isolated paper specks when despeckle is enabled', () => {
    const w = 3;
    const h = 3;
    const rgba = new Uint8Array(w * h * 4).fill(245);
    // Single isolated dark speck in the center pixel (1,1)
    const center = (1 * w + 1) * 4;
    rgba[center] = 90;
    rgba[center + 1] = 90;
    rgba[center + 2] = 90;

    const cleaned = applyScanFilterToRgba(rgba, w, h, 'original', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      despeckle: true,
    });
    expect(cleaned[center]).toBeGreaterThan(220);
  });

  it('detects sideways vertical text lines for auto-orientation', () => {
    const w = 64;
    const h = 64;
    const rgba = new Uint8Array(w * h * 4).fill(245);
    // Draw strong vertical bars (simulating sideways horizontal text lines)
    for (let y = 8; y < 56; y++) {
      for (const x of [16, 26, 36, 46]) {
        const idx = (y * w + x) * 4;
        rgba[idx] = 20;
        rgba[idx + 1] = 20;
        rgba[idx + 2] = 20;
      }
    }
    expect(shouldRotate90ForUprightText(rgba, w, h)).toBe(true);
  });

  it('cleans dark outer margins and renders status stamp overlay', () => {
    const w = 120;
    const h = 120;
    const rgba = new Uint8Array(w * h * 4).fill(250);
    // Dark outer border pixel at (0, 0)
    rgba[0] = 30;
    rgba[1] = 30;
    rgba[2] = 30;

    const out = applyScanFilterToRgba(rgba, w, h, 'original', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      cleanMargins: true,
      stamp: 'PAID',
    });

    // Outer edge is whitened
    expect(out[0]).toBe(255);
    // Stamp region near bottom-right has green-tinted pixels (PAID stamp)
    let hasGreenStamp = false;
    for (let y = h - 40; y < h; y++) {
      for (let x = w - 60; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (out[idx + 1] > out[idx] + 20) {
          hasGreenStamp = true;
          break;
        }
      }
      if (hasGreenStamp) break;
    }
    expect(hasGreenStamp).toBe(true);
  });

  it('warps with decurl page-curl flattening enabled', () => {
    const w = 20;
    const h = 20;
    const src = new Uint8Array(w * h * 4).fill(240);
    const dst = warpPerspectiveRgba(
      src,
      w,
      h,
      {
        topLeft: { x: 0, y: 0 },
        topRight: { x: w - 1, y: 0 },
        bottomRight: { x: w - 1, y: h - 1 },
        bottomLeft: { x: 0, y: h - 1 },
      },
      w,
      h,
      true
    );
    expect(dst.length).toBe(w * h * 4);
    expect(dst[0]).toBe(240);
  });

  it('applies interactive eraser strokes and handwritten signature strokes', () => {
    const w = 120;
    const h = 120;
    const rgba = new Uint8Array(w * h * 4).fill(250);
    // Dark smudge at center (60, 60)
    const smudgeIdx = (60 * w + 60) * 4;
    rgba[smudgeIdx] = 20;
    rgba[smudgeIdx + 1] = 20;
    rgba[smudgeIdx + 2] = 20;

    const out = applyScanFilterToRgba(rgba, w, h, 'original', {
      brightness: 0,
      contrast: 0,
      sharpness: 0,
      eraserStrokes: [[{ x: 0.5, y: 0.5 }]],
      signatureStrokes: [[{ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }]],
    });

    // Center smudge was painted white by eraser brush
    expect(out[smudgeIdx]).toBe(255);

    // Bottom-right signature box has dark ink pixels
    let hasDarkSignature = false;
    for (let y = h - 30; y < h; y++) {
      for (let x = w - 50; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (out[idx] < 40 && out[idx + 1] < 40) {
          hasDarkSignature = true;
          break;
        }
      }
      if (hasDarkSignature) break;
    }
    expect(hasDarkSignature).toBe(true);
  });

  it('magic_color whitens warm paper cast to pure white while keeping ink dark', () => {
    const w = 6;
    const h = 6;
    const rgba = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = 215;
      rgba[i * 4 + 1] = 205;
      rgba[i * 4 + 2] = 185;
      rgba[i * 4 + 3] = 255;
    }
    // Dark ink pixel at center (3, 3)
    const inkIdx = (3 * w + 3) * 4;
    rgba[inkIdx] = 45;
    rgba[inkIdx + 1] = 45;
    rgba[inkIdx + 2] = 45;

    const out = applyScanFilterToRgba(rgba, w, h, 'magic_color', {
      brightness: 0,
      contrast: 0,
      sharpness: 20,
      whitening: 50,
    });

    // Warm paper background snaps cleanly to pure white
    expect(out[0]).toBe(255);
    expect(out[1]).toBe(255);
    expect(out[2]).toBe(255);
    // Ink stays crisp dark
    expect(out[inkIdx]).toBeLessThan(80);
  });
});
